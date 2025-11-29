import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getProject = query({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const saveProject = mutation({
	args: {
		id: v.id("projects"),
		timeline: v.optional(v.any()),
		textBinItems: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const project = await ctx.db.get(args.id);
		if (!project) throw new Error("Project not found");

		let currentData: any = {};
		try {
			currentData = JSON.parse(project.timelineData);
		} catch (e) {
			// ignore
		}

		const newData = {
			...currentData,
			...(args.timeline !== undefined ? { timeline: args.timeline } : {}),
			...(args.textBinItems !== undefined ? { textBinItems: args.textBinItems } : {}),
		};

		await ctx.db.patch(args.id, { timelineData: JSON.stringify(newData) });
	},
});

export const createProject = mutation({
	args: { name: v.string(), userId: v.string() },
	handler: async (ctx, args) => {
		const defaultTimeline = {
			tracks: [
				{ id: "track-1", name: "Track 1", items: [], scrubbers: [], transitions: [] },
				{ id: "track-2", name: "Track 2", items: [], scrubbers: [], transitions: [] },
				{ id: "track-3", name: "Track 3", items: [], scrubbers: [], transitions: [] },
			],
		};

		return await ctx.db.insert("projects", {
			name: args.name,
			timelineData: JSON.stringify({ timeline: defaultTimeline, textBinItems: [] }),
			userId: args.userId,
		});
	},
});

export const deleteProject = mutation({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});

export const renameProject = mutation({
	args: { id: v.id("projects"), name: v.string() },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { name: args.name });
	},
});

export const listProjects = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("projects")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();
	},
});

export const saveRenderResult = internalMutation({
	args: { id: v.id("projects"), renderStorageId: v.id("_storage") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { renderStorageId: args.renderStorageId });
	},
});
