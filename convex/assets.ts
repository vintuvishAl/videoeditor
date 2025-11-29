import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});

export const saveAsset = mutation({
	args: {
		storageId: v.id("_storage"),
		name: v.string(),
		type: v.string(),
		size: v.number(),
		userId: v.string(),
		projectId: v.optional(v.id("projects")),
		metadata: v.object({
			width: v.number(),
			height: v.number(),
			duration: v.number(),
		}),
	},
	handler: async (ctx, args) => {
		const url = await ctx.storage.getUrl(args.storageId);
		if (!url) throw new Error("Failed to get download URL");

		const assetId = await ctx.db.insert("assets", {
			storageId: args.storageId,
			name: args.name,
			type: args.type,
			size: args.size,
			userId: args.userId,
			projectId: args.projectId,
			url,
			metadata: args.metadata,
		});

		return { assetId, url };
	},
});

export const getAssets = query({
	args: { projectId: v.optional(v.id("projects")), userId: v.string() },
	handler: async (ctx, args) => {
		const q = ctx.db
			.query("assets")
			.withIndex("by_user_project", (q) =>
				q.eq("userId", args.userId).eq("projectId", args.projectId)
			);

		return await q.collect();
	},
});

export const deleteAsset = mutation({
	args: { id: v.id("assets") },
	handler: async (ctx, args) => {
		const asset = await ctx.db.get(args.id);
		if (!asset) throw new Error("Asset not found");

		await ctx.storage.delete(asset.storageId);
		await ctx.db.delete(args.id);
	},
});
