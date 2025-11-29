import { useParams, useNavigate, useLoaderData, type LoaderFunctionArgs } from "react-router";
import React, { useEffect } from "react";
import TimelineEditor from "./home";
import { auth } from "~/lib/auth.server";
import { loadTimeline } from "~/lib/timeline.store";
import type { TimelineState } from "~/components/timeline/types";

export async function loader({ request, params }: LoaderFunctionArgs) {
	// SSR gate: verify auth
	if (process.env.NODE_ENV === "development") return null;

	try {
		const session = await auth.api?.getSession?.({ headers: request.headers });
		const uid: string | undefined = session?.user?.id || session?.session?.userId;
		if (!uid)
			return new Response(null, {
				status: 302,
				headers: { Location: "/login" },
			});
	} catch {
		return new Response(null, { status: 302, headers: { Location: "/login" } });
	}
	// Optionally prefetch timeline to hydrate client faster
	const id = params.id as string;
	const timeline = await loadTimeline(id);
	return { timeline };
}

export default function ProjectEditorRoute() {
	const params = useParams();
	const navigate = useNavigate();
	const id = params.id as string;
	const data = useLoaderData() as { timeline?: TimelineState };

	// Removed legacy fetch check. 
	// TODO: Add Convex-based existence check if needed, or let Home component handle it.

	// Pass through existing editor; it manages state internally. We injected loader for prefetch.
	return <TimelineEditor />;
}
