import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	projects: defineTable({
		timelineData: v.string(), // JSON string of ProjectStateFile
		userId: v.string(),
		name: v.string(),
		renderStorageId: v.optional(v.id("_storage")),
	}).index("by_user", ["userId"]),
	assets: defineTable({
		userId: v.string(),
		projectId: v.optional(v.id("projects")),
		storageId: v.id("_storage"),
		name: v.string(),
		type: v.string(), // "video", "image", "audio"
		url: v.string(),
		size: v.number(),
		metadata: v.object({
			width: v.number(),
			height: v.number(),
			duration: v.number(), // in seconds
		}),
	}).index("by_user_project", ["userId", "projectId"]),
});
