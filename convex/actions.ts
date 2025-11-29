"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ... (rest of imports)

// ... (inside triggerRender handler)


export const chat = action({
	args: {
		message: v.string(),
		mentioned_scrubber_ids: v.optional(v.array(v.string())),
		timeline_state: v.any(),
		mediabin_items: v.any(),
		chat_history: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			return {
				assistant_message: "Error: GEMINI_API_KEY is not set in Convex environment variables.",
			};
		}

		const prompt = `
      You are Kimu, an AI assistant inside a video editor. You can decide to either:
      - call ONE tool from the provided schema when the user explicitly asks for an editing action, or
      - return a short friendly assistant_message when no concrete action is needed (e.g., greetings, small talk, clarifying questions).

      Strictly follow:
      - If the user's message does not clearly request an editing action, set function_call to null and include an assistant_message.
      - Only produce a function_call when it is safe and unambiguous to execute.

      Inference rules:
      - Assume a single active timeline; do NOT require a timeline_id.
      - Tracks are named like "track-1", but when the user says "track 1" they mean number 1.
      - Use pixels_per_second=100 by default if not provided.
      - When the user names media like "twitter" or "twitter header", map that to the closest media in the media bin by name substring match.
      - Prefer LLMAddScrubberByName when the user specifies a name, track number, and time in seconds.
      - If the user asks to remove scrubbers in a specific track, call LLMDeleteScrubbersInTrack with that track number.

      Conversation so far (oldest first): ${JSON.stringify(args.chat_history)}

      User message: ${args.message}
      Mentioned scrubber ids: ${JSON.stringify(args.mentioned_scrubber_ids)}
      Timeline state: ${JSON.stringify(args.timeline_state)}
      Media bin items: ${JSON.stringify(args.mediabin_items)}
    `;

		const tools = [
			{
				name: "LLMAddScrubberToTimeline",
				description: "Add a media item (scrubber) to the timeline.",
				parameters: {
					type: "OBJECT",
					properties: {
						scrubber_id: { type: "STRING", description: "The ID of the media item to add." },
						track_id: { type: "STRING", description: "The track ID (e.g., 'track-1')." },
						drop_left_px: { type: "NUMBER", description: "The horizontal position in pixels." },
					},
					required: ["scrubber_id", "track_id", "drop_left_px"],
				},
			},
			{
				name: "LLMMoveScrubber",
				description: "Move an existing scrubber to a new position or track.",
				parameters: {
					type: "OBJECT",
					properties: {
						scrubber_id: { type: "STRING", description: "The ID of the scrubber to move." },
						new_position_seconds: { type: "NUMBER", description: "The new start time in seconds." },
						new_track_number: { type: "INTEGER", description: "The new track number (1-based)." },
						pixels_per_second: { type: "NUMBER", description: "Current zoom level (pixels per second)." },
					},
					required: ["scrubber_id", "new_position_seconds", "new_track_number"],
				},
			},
			{
				name: "LLMAddScrubberByName",
				description: "Add a media item by name.",
				parameters: {
					type: "OBJECT",
					properties: {
						scrubber_name: { type: "STRING", description: "The name of the media item." },
						track_number: { type: "INTEGER", description: "The track number (1-based)." },
						position_seconds: { type: "NUMBER", description: "The start time in seconds." },
						pixels_per_second: { type: "NUMBER", description: "Current zoom level." },
					},
					required: ["scrubber_name", "track_number", "position_seconds"],
				},
			},
			{
				name: "LLMDeleteScrubbersInTrack",
				description: "Delete all scrubbers in a specific track.",
				parameters: {
					type: "OBJECT",
					properties: {
						track_number: { type: "INTEGER", description: "The track number (1-based)." },
					},
					required: ["track_number"],
				},
			},
		];

		try {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						tools: [{ function_declarations: tools }],
						tool_config: { function_calling_config: { mode: "AUTO" } },
					}),
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Gemini API error:", errorText);
				return { assistant_message: "Error calling AI service." };
			}

			const data = await response.json();
			const candidate = data.candidates?.[0];
			const part = candidate?.content?.parts?.[0];

			if (part?.functionCall) {
				return {
					function_call: {
						function_name: part.functionCall.name,
						...part.functionCall.args,
					},
				};
			} else if (part?.text) {
				return { assistant_message: part.text };
			}

			return { assistant_message: "I'm not sure how to help with that." };
		} catch (e) {
			console.error("Action error:", e);
			return { assistant_message: "Internal error processing request." };
		}
	},
});

export const triggerRender = action({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const project = await ctx.runQuery(api.projects.getProject, { id: args.projectId });
		if (!project) throw new Error("Project not found");

		const renderUrl = process.env.RENDER_SERVER_URL || "http://localhost:8000";

		let timelineDataObj;
		try {
			timelineDataObj = JSON.parse(project.timelineData);
		} catch (e) {
			throw new Error("Invalid timeline data");
		}

		const response = await fetch(`${renderUrl}/render`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				timelineData: timelineDataObj,
				durationInFrames: 300, // Default or calculate from timeline
				compositionWidth: 1920,
				compositionHeight: 1080,
				getPixelsPerSecond: 100, // Default
			}),
		});

		if (!response.ok) {
			throw new Error(`Render failed: ${await response.text()}`);
		}

		const blob = await response.blob();
		const storageId = await ctx.storage.store(blob);

		await ctx.runMutation(internal.projects.saveRenderResult, {
			id: args.projectId,
			renderStorageId: storageId,
		});

		return storageId;
	},
});
