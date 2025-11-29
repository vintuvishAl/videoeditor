import React from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { VividLogo } from "~/components/ui/VividLogo";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { VideoPlayer } from "~/video-compositions/VideoPlayer";
import { MuteButton, FullscreenButton } from "~/components/ui/video-controls";
import type { PlayerRef } from "@remotion/player";
import type { TimelineState, TimelineDataItem, ScrubberState } from "~/components/timeline/types";

interface PreviewAreaProps {
	timeline: TimelineState;
	setResolution: (res: "4k" | "shorts") => void;
	isAutoSize: boolean;
	setIsAutoSize: (auto: boolean) => void;
	isChatMinimized: boolean;
	setIsChatMinimized: (minimized: boolean) => void;
	timelineData: TimelineDataItem[];
	durationInFrames: number;
	playerRef: React.RefObject<PlayerRef>;
	width: number;
	height: number;
	handleUpdateScrubber: (scrubber: ScrubberState) => void;
	selectedItem: string | null;
	setSelectedItem: (id: string | null) => void;
	getPixelsPerSecond: () => number;
	isPlaying: boolean;
	togglePlayback: () => void;
}

export function PreviewArea({
	timeline,
	setResolution,
	isAutoSize,
	setIsAutoSize,
	isChatMinimized,
	setIsChatMinimized,
	timelineData,
	durationInFrames,
	playerRef,
	width,
	height,
	handleUpdateScrubber,
	selectedItem,
	setSelectedItem,
	getPixelsPerSecond,
	isPlaying,
	togglePlayback,
}: PreviewAreaProps) {
	return (
		<div className="h-full flex flex-col bg-background">
			{/* Compact Top Bar */}
			<div className="h-8 border-b border-border/50 bg-muted/30 flex items-center justify-between px-3 shrink-0">
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<span>Resolution:</span>
					<Select
						value={timeline.resolution || "4k"}
						onValueChange={(value: "4k" | "shorts") => setResolution(value)}
					>
						<SelectTrigger className="h-6 w-[130px] text-xs bg-muted/50 border-0">
							<SelectValue placeholder="Select resolution" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="4k">YouTube 4K (16:9)</SelectItem>
							<SelectItem value="shorts">Shorts (9:16)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-1">
					<div className="flex items-center gap-1">
						<Switch
							id="auto-size"
							checked={isAutoSize}
							onCheckedChange={setIsAutoSize}
							className="scale-75"
						/>
						<Label htmlFor="auto-size" className="text-xs">
							Auto
						</Label>
					</div>

					{!isChatMinimized && null}
					{isChatMinimized && (
						<>
							<Separator orientation="vertical" className="h-4 mx-1" />
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsChatMinimized(false)}
								className="h-6 w-6 p-0 text-primary"
								title="Open Chat"
							>
								<VividLogo className="h-3 w-3" showText={false} />
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Video Preview */}
			<div
				className={
					"flex-1 bg-zinc-200/70 dark:bg-zinc-900 " +
					"flex flex-col items-center justify-center p-3 border border-border/50 rounded-lg overflow-hidden shadow-2xl relative"
				}
			>
				<div className="flex-1 flex items-center justify-center w-full">
					<VideoPlayer
						timelineData={timelineData}
						durationInFrames={durationInFrames}
						ref={playerRef}
						compositionWidth={isAutoSize ? null : width}
						compositionHeight={isAutoSize ? null : height}
						timeline={timeline}
						handleUpdateScrubber={handleUpdateScrubber}
						selectedItem={selectedItem}
						setSelectedItem={setSelectedItem}
						getPixelsPerSecond={getPixelsPerSecond}
					/>
				</div>

				{/* Custom Video Controls - Below Player */}
				<div className="w-full flex items-center justify-center gap-2 mt-3 px-4">
					{/* Left side controls */}
					<div className="flex items-center gap-1">
						<MuteButton playerRef={playerRef} />
					</div>

					{/* Center play/pause button */}
					<div className="flex items-center">
						<Button
							variant="ghost"
							size="sm"
							onClick={togglePlayback}
							className="h-6 w-6 p-0"
						>
							{isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
						</Button>
					</div>

					{/* Right side controls */}
					<div className="flex items-center gap-1">
						<FullscreenButton playerRef={playerRef} />
					</div>
				</div>
			</div>
		</div>
	);
}
