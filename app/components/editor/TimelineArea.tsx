import React from "react";
import {
	Plus,
	Minus,
	Scissors,
	Settings,
	CornerUpLeft,
	CornerUpRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { TimelineRuler } from "~/components/timeline/TimelineRuler";
import { TimelineTracks } from "~/components/timeline/TimelineTracks";
import type {
	TimelineState,
	ScrubberState,
	MediaBinItem,
	Transition,
} from "~/components/timeline/types";
import { FPS } from "~/components/timeline/types";

interface TimelineAreaProps {
	durationInFrames: number;
	pixelsPerSecond: number;
	timelineWidth: number;
	zoomLevel: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onZoomReset: () => void;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	onAddTrack: () => void;
	onSplit: () => void;
	onDebug: () => void;
	containerRef: React.RefObject<HTMLDivElement>;
	rulerPositionPx: number;
	onRulerDrag: (e: MouseEvent) => void;
	onRulerMouseDown: (e: React.MouseEvent) => void;
	timeline: TimelineState;
	onScroll: () => void;
	onDeleteTrack: (id: string) => void;
	onUpdateScrubber: (scrubber: ScrubberState) => void;
	onDeleteScrubber: (id: string) => void;
	onDropOnTrack: (item: MediaBinItem, trackId: string, px: number) => void;
	onDropTransition: (transition: Transition, trackId: string, px: number) => void;
	onDeleteTransition: (id: string) => void;
	getAllScrubbers: () => ScrubberState[];
	expandTimeline: () => void;
	selectedScrubberIds: string[];
	onSelectScrubber: (id: string | null, ctrl?: boolean) => void;
	onGroupScrubbers: () => void;
	onUngroupScrubber: (id: string) => void;
	onMoveToMediaBin: (id: string) => void;
	onSnapshot: () => void;
}

export function TimelineArea({
	durationInFrames,
	pixelsPerSecond,
	timelineWidth,
	zoomLevel,
	onZoomIn,
	onZoomOut,
	onZoomReset,
	undo,
	redo,
	canUndo,
	canRedo,
	onAddTrack,
	onSplit,
	onDebug,
	containerRef,
	rulerPositionPx,
	onRulerDrag,
	onRulerMouseDown,
	timeline,
	onScroll,
	onDeleteTrack,
	onUpdateScrubber,
	onDeleteScrubber,
	onDropOnTrack,
	onDropTransition,
	onDeleteTransition,
	getAllScrubbers,
	expandTimeline,
	selectedScrubberIds,
	onSelectScrubber,
	onGroupScrubbers,
	onUngroupScrubber,
	onMoveToMediaBin,
	onSnapshot,
}: TimelineAreaProps) {
	return (
		<div className="h-full flex flex-col bg-muted/20">
			<div className="h-8 border-b border-border/50 bg-muted/30 flex items-center justify-between px-3 shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium">Timeline</span>
					<Badge variant="outline" className="text-xs h-4 px-1.5 font-mono">
						{Math.round(((durationInFrames || 0) / FPS) * 10) / 10}s
					</Badge>
					<Button
						variant="ghost"
						size="sm"
						onClick={undo}
						disabled={!canUndo}
						className="h-6 w-6 p-0"
						title="Undo (Ctrl/Cmd+Z)"
					>
						<CornerUpLeft className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={redo}
						disabled={!canRedo}
						className="h-6 w-6 p-0"
						title="Redo (Ctrl/Cmd+Shift+Z)"
					>
						<CornerUpRight className="h-3 w-3" />
					</Button>
				</div>
				<div className="flex items-center gap-1">
					<div className="flex items-center">
						<Button
							variant="ghost"
							size="sm"
							onClick={onZoomOut}
							className="h-6 w-6 p-0 text-xs"
							title="Zoom Out"
						>
							<Minus className="h-3 w-3" />
						</Button>
						<Badge
							variant="secondary"
							className="text-xs h-4 px-1.5 font-mono cursor-pointer hover:bg-secondary/80 transition-colors"
							onClick={onZoomReset}
							title="Click to reset zoom to 100%"
						>
							{Math.round(zoomLevel * 100)}%
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							onClick={onZoomIn}
							className="h-6 w-6 p-0 text-xs"
							title="Zoom In"
						>
							<Plus className="h-3 w-3" />
						</Button>
					</div>
					<Separator orientation="vertical" className="h-4 mx-1" />
					<Button
						variant="ghost"
						size="sm"
						onClick={onAddTrack}
						className="h-6 px-2 text-xs"
					>
						<Plus className="h-3 w-3 mr-1" />
						Track
					</Button>
					<Separator orientation="vertical" className="h-4 mx-1" />
					<Button
						variant="ghost"
						size="sm"
						onClick={onSplit}
						className="h-6 px-2 text-xs"
						title="Split selected scrubber at ruler position"
					>
						<Scissors className="h-3 w-3 mr-1" />
						Split
					</Button>
					<Separator orientation="vertical" className="h-4 mx-1" />
					<Button
						variant="ghost"
						size="sm"
						onClick={onDebug}
						className="h-6 px-2 text-xs"
					>
						<Settings className="h-3 w-3 mr-1" />
						Debug
					</Button>
				</div>
			</div>

			<TimelineRuler
				timelineWidth={timelineWidth}
				rulerPositionPx={rulerPositionPx}
				containerRef={containerRef}
				onRulerDrag={onRulerDrag}
				onRulerMouseDown={onRulerMouseDown}
				pixelsPerSecond={pixelsPerSecond}
				scrollLeft={containerRef.current?.scrollLeft || 0}
			/>

			<TimelineTracks
				timeline={timeline}
				timelineWidth={timelineWidth}
				rulerPositionPx={rulerPositionPx}
				containerRef={containerRef}
				onScroll={onScroll}
				onDeleteTrack={onDeleteTrack}
				onUpdateScrubber={onUpdateScrubber}
				onDeleteScrubber={onDeleteScrubber}
				onDropOnTrack={onDropOnTrack}
				onDropTransitionOnTrack={onDropTransition}
				onDeleteTransition={onDeleteTransition}
				getAllScrubbers={getAllScrubbers}
				expandTimeline={expandTimeline}
				onRulerMouseDown={onRulerMouseDown}
				pixelsPerSecond={pixelsPerSecond}
				selectedScrubberIds={selectedScrubberIds}
				onSelectScrubber={onSelectScrubber}
				onGroupScrubbers={onGroupScrubbers}
				onUngroupScrubber={onUngroupScrubber}
				onMoveToMediaBin={onMoveToMediaBin}
				onBeginScrubberTransform={onSnapshot}
			/>
		</div>
	);
}
