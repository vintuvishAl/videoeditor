import React, { useRef, useEffect, useCallback, useState } from "react";
import type { PlayerRef, CallbackListener } from "@remotion/player";

// Components
import LeftPanel from "~/components/editor/LeftPanel";
import { RenderStatus } from "~/components/timeline/RenderStatus";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "~/components/ui/resizable";
import { toast } from "sonner";

// New Components
import { TopBar } from "~/components/editor/TopBar";
import { PreviewArea } from "~/components/editor/PreviewArea";
import { TimelineArea } from "~/components/editor/TimelineArea";

// Hooks
import { useTimeline } from "~/hooks/useTimeline";
import { useMediaBin } from "~/hooks/useMediaBin";
import { useRuler } from "~/hooks/useRuler";
import { useRenderer } from "~/hooks/useRenderer";

// Types and constants
import {
	FPS,
	type MediaBinItem,
	type Transition,
	type ScrubberState,
} from "~/components/timeline/types";
import { useNavigate, useParams } from "react-router";
import { ChatBox } from "~/components/chat/ChatBox";
import { useAuth } from "~/hooks/useAuth";
import { AuthOverlay } from "~/components/ui/AuthOverlay";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface Message {
	id: string;
	content: string;
	isUser: boolean;
	timestamp: Date;
}

export default function TimelineEditor() {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<PlayerRef>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const navigate = useNavigate();
	const params = useParams();
	const projectId = params?.id as string | undefined;

	// Convex hooks
	const convexProject = useQuery(api.projects.getProject, projectId ? { id: projectId as Id<"projects"> } : "skip");
	const saveProject = useMutation(api.projects.saveProject);
	const triggerRender = useAction(api.actions.triggerRender);

	const [projectName, setProjectName] = useState<string>("");

	const [width, setWidth] = useState<number>(1920);
	const [height, setHeight] = useState<number>(1080);
	const [isAutoSize, setIsAutoSize] = useState<boolean>(false);
	// Text fields for width/height to allow clearing while typing
	const [widthInput, setWidthInput] = useState<string>("1920");
	const [heightInput, setHeightInput] = useState<string>("1080");

	// Keep inputs in sync if width/height change elsewhere
	useEffect(() => {
		setWidthInput(String(width));
	}, [width]);
	useEffect(() => {
		setHeightInput(String(height));
	}, [height]);

	const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);

	const [chatMessages, setChatMessages] = useState<Message[]>([]);
	const [starCount, setStarCount] = useState<number | null>(null);

	const [selectedScrubberIds, setSelectedScrubberIds] = useState<string[]>([]);

	// video player media selection state
	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	const {
		timeline,
		timelineWidth,
		zoomLevel,
		getPixelsPerSecond,
		getTimelineData,
		getTimelineState,
		expandTimeline,
		handleAddTrack,
		handleDeleteTrack,
		getAllScrubbers,
		handleUpdateScrubber,
		handleDeleteScrubber,
		handleDeleteScrubbersByMediaBinId,
		handleDropOnTrack,
		handleSplitScrubberAtRuler,
		handleZoomIn,
		handleZoomOut,
		handleZoomReset,
		handleGroupScrubbers,
		handleUngroupScrubber,
		handleMoveGroupToMediaBin,
		// Transition management
		handleAddTransitionToTrack,
		handleDeleteTransition,
		getConnectedElements,
		handleUpdateScrubberWithLocking,
		setTimelineFromServer,
		setResolution,
		// undo/redo
		undo,
		redo,
		canUndo,
		canRedo,
		snapshotTimeline,
	} = useTimeline(projectId);

	// Sync width/height with resolution mode
	useEffect(() => {
		if (timeline.resolution === "shorts") {
			setWidth(1080);
			setHeight(1920);
		} else {
			// Default to 4K (or if resolution is "4k")
			setWidth(3840);
			setHeight(2160);
		}
	}, [timeline.resolution]);

	const {
		mediaBinItems,
		isMediaLoading,
		getMediaBinItems,
		setTextItems,
		handleAddMediaToBin,
		handleAddTextToBin,
		handleAddGroupToMediaBin,
		contextMenu,
		handleContextMenu,
		handleDeleteFromContext,
		handleSplitAudioFromContext,
		handleCloseContextMenu,
	} = useMediaBin(handleDeleteScrubbersByMediaBinId);

	const {
		rulerPositionPx,
		isDraggingRuler,
		handleRulerDrag,
		handleRulerMouseDown,
		handleRulerMouseMove,
		handleRulerMouseUp,
		handleScroll,
		updateRulerFromPlayer,
	} = useRuler(playerRef, timelineWidth, getPixelsPerSecond());

	const { isRendering, renderStatus, handleRenderVideo } = useRenderer();

	// Wrapper function for transition drop handler to match expected interface
	const handleDropTransitionOnTrackWrapper = (transition: Transition, trackId: string, dropLeftPx: number) => {
		handleAddTransitionToTrack(trackId, transition, dropLeftPx);
	};

	// Derived values
	const timelineData = getTimelineData();
	const durationInFrames = (() => {
		let maxEndTime = 0;

		// Calculate the maximum end time from all scrubbers
		// Since overlapping scrubbers are already positioned correctly,
		// we just need the maximum end time
		timelineData.forEach((timelineItem) => {
			timelineItem.scrubbers.forEach((scrubber) => {
				if (scrubber.endTime > maxEndTime) maxEndTime = scrubber.endTime;
			});
		});

		return Math.ceil(maxEndTime * FPS);
	})();

	// Event handlers with toast notifications
	const handleAddMediaClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	// Hydrate project name and textBinItems from Convex
	useEffect(() => {
		if (convexProject && convexProject.timelineData) {
			try {
				const parsed = JSON.parse(convexProject.timelineData);
				// Timeline is handled by useTimeline

				// Handle textBinItems
				if (Array.isArray(parsed.textBinItems) && parsed.textBinItems.length) {
					const textItems: typeof mediaBinItems = parsed.textBinItems.map((t: MediaBinItem) => ({
						id: t.id,
						name: t.name,
						mediaType: "text" as const,
						media_width: Number(t.media_width) || 0,
						media_height: Number(t.media_height) || 0,
						text: t.text || null,
						mediaUrlLocal: null,
						mediaUrlRemote: null,
						durationInSeconds: Number(t.durationInSeconds) || 0,
						isUploading: false,
						uploadProgress: null,
						left_transition_id: null,
						right_transition_id: null,
						groupped_scrubbers: t.groupped_scrubbers || null,
					}));
					setTextItems(textItems);
				}
			} catch (e) {
				console.error("Failed to parse project data", e);
			}
		}
	}, [convexProject, setTextItems]);

	// Re-link scrubbers to remote asset URLs after assets hydrate
	// Ensures images/videos/audios render after refresh (when local blob URLs are gone)
	useEffect(() => {
		if (isMediaLoading) return;
		if (!mediaBinItems || mediaBinItems.length === 0) return;

		const current = getTimelineState();
		let changed = false;

		const assetsByName = new Map(
			mediaBinItems.filter((i) => i.mediaType !== "text" && i.mediaUrlRemote).map((i) => [i.name, i]),
		);

		const newTracks = current.tracks.map((track) => ({
			...track,
			scrubbers: track.scrubbers.map((s) => {
				if (s.mediaType === "text") return s;
				if (!s.mediaUrlRemote) {
					const match = assetsByName.get(s.name);
					if (match && match.mediaUrlRemote) {
						changed = true;
						return {
							...s,
							mediaUrlRemote: match.mediaUrlRemote,
							sourceMediaBinId: match.id,
							media_width: match.media_width || s.media_width,
							media_height: match.media_height || s.media_height,
						};
					}
				}
				return s;
			}),
		}));

		if (changed) {
			setTimelineFromServer({ ...current, tracks: newTracks });
		}
	}, [isMediaLoading, mediaBinItems, getTimelineState, setTimelineFromServer]);

	// Save timeline to server
	// Save timeline to server (Manual save)
	const handleSaveTimeline = useCallback(async () => {
		try {
			toast.info("Saving state of the project...");
			if (!projectId) {
				toast.error("No project ID");
				return;
			}
			const timelineState = getTimelineState();
			// persist current text items alongside timeline
			const textItemsPayload = getMediaBinItems().filter((i) => i.mediaType === "text");

			await saveProject({
				id: projectId as Id<"projects">,
				timeline: timelineState,
				textBinItems: textItemsPayload,
			});

			toast.success("Timeline saved");
		} catch (e) {
			console.error(e);
			toast.error("Failed to save");
		}
	}, [getMediaBinItems, getTimelineState, projectId, saveProject]);

	const handleRender = async () => {
		if (!projectId) return;
		try {
			toast.info("Starting render...");
			// Save first
			await handleSaveTimeline();

			const storageId = await triggerRender({ projectId: projectId as Id<"projects"> });
			toast.success("Render complete! Storage ID: " + storageId);
		} catch (e: any) {
			console.error(e);
			toast.error("Render failed: " + e.message);
		}
	};

	// Global Ctrl/Cmd+S to save timeline (registered after handler is defined)
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const isInputEl =
				((e.target as HTMLElement)?.tagName || "").match(/^(INPUT|TEXTAREA)$/) ||
				(e.target as HTMLElement)?.isContentEditable;
			if (isInputEl) return;
			const key = e.key.toLowerCase();
			if ((e.ctrlKey || e.metaKey) && key === "s") {
				e.preventDefault();
				e.stopPropagation();
				handleSaveTimeline();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
				e.preventDefault();
				e.stopPropagation();
				undo();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && key === "z" && e.shiftKey) {
				e.preventDefault();
				e.stopPropagation();
				redo();
				return;
			}
			// Delete selected item from Player (not just timeline scrubber)
			if (key === "delete") {
				if (selectedItem) {
					e.preventDefault();
					e.stopPropagation();
					handleDeleteScrubber(selectedItem);
					setSelectedItem(null);
					return;
				}
			}
		};
		window.addEventListener("keydown", onKeyDown, {
			capture: true,
		} as AddEventListenerOptions);
		return () =>
			window.removeEventListener("keydown", onKeyDown, {
				capture: true,
			} as AddEventListenerOptions);
	}, [handleSaveTimeline, undo, redo, selectedItem, handleDeleteScrubber, setSelectedItem]);

	const handleFileInputChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				const fileArray = Array.from(files);
				let successCount = 0;
				let errorCount = 0;

				// Process files sequentially to avoid overwhelming the system
				for (const file of fileArray) {
					try {
						await handleAddMediaToBin(file);
						successCount++;
					} catch (error) {
						errorCount++;
						console.error(`Failed to add ${file.name}:`, error);
					}
				}

				if (successCount > 0 && errorCount > 0) {
					toast.warning(`Imported ${successCount} file${successCount > 1 ? "s" : ""}, ${errorCount} failed`);
				} else if (errorCount > 0) {
					toast.error(`Failed to import ${errorCount} file${errorCount > 1 ? "s" : ""}`);
				}

				e.target.value = "";
			}
		},
		[handleAddMediaToBin],
	);

	const handleLogTimelineData = useCallback(() => {
		if (timelineData.length === 0) {
			toast.error("Timeline is empty");
			return;
		}
		console.log(JSON.stringify(getTimelineData(), null, 2));
		toast.success("Timeline data logged to console");
	}, [getTimelineData, timelineData]);

	const handleAddTrackClick = useCallback(() => {
		handleAddTrack();
	}, [handleAddTrack]);

	// Handler for multi-selection with Ctrl+click support
	const handleSelectScrubber = useCallback((scrubberId: string | null, ctrlKey: boolean = false) => {
		if (scrubberId === null) {
			setSelectedScrubberIds([]);
			return;
		}

		if (ctrlKey) {
			setSelectedScrubberIds(prev => {
				if (prev.includes(scrubberId)) {
					// If already selected, remove it
					return prev.filter(id => id !== scrubberId);
				} else {
					// If not selected, add it
					return [...prev, scrubberId];
				}
			});
		} else {
			// Normal click - select only this scrubber
			setSelectedScrubberIds([scrubberId]);
		}
	}, []);

	const handleSplitClick = useCallback(() => {
		if (selectedScrubberIds.length === 0) {
			toast.error("Please select a scrubber to split first!");
			return;
		}

		if (selectedScrubberIds.length > 1) {
			toast.error("Please select only one scrubber to split!");
			return;
		}

		if (timelineData.length === 0 ||
			timelineData.every((item) => item.scrubbers.length === 0)) {
			toast.error("No scrubbers to split. Add some media first!");
			return;
		}

		const splitCount = handleSplitScrubberAtRuler(rulerPositionPx, selectedScrubberIds[0]);
		if (splitCount === 0) {
			toast.info("Cannot split: ruler is not positioned within the selected scrubber");
		} else {
			setSelectedScrubberIds([]); // Clear selection since original scrubber is replaced
			toast.success(`Split the selected scrubber at ruler position`);
		}
	}, [handleSplitScrubberAtRuler, rulerPositionPx, selectedScrubberIds, timelineData]);

	// Handler for grouping selected scrubbers
	const handleGroupSelected = useCallback(() => {
		if (selectedScrubberIds.length < 2) {
			toast.error("Please select at least 2 scrubbers to group!");
			return;
		}

		handleGroupScrubbers(selectedScrubberIds);
		setSelectedScrubberIds([]); // Clear selection after grouping
		toast.success(`Grouped ${selectedScrubberIds.length} scrubbers`);
	}, [selectedScrubberIds, handleGroupScrubbers]);

	// Handler for ungrouping a grouped scrubber
	const handleUngroupSelected = useCallback((scrubberId: string) => {
		handleUngroupScrubber(scrubberId);
		setSelectedScrubberIds([]); // Clear selection after ungrouping
		toast.success("Ungrouped scrubber");
	}, [handleUngroupScrubber]);

	// Handler for moving grouped scrubber to media bin
	const handleMoveToMediaBinSelected = useCallback((scrubberId: string) => {
		handleMoveGroupToMediaBin(scrubberId, handleAddGroupToMediaBin);
		setSelectedScrubberIds([]); // Clear selection after moving
	}, [handleMoveGroupToMediaBin, handleAddGroupToMediaBin]);

	const expandTimelineCallback = useCallback(() => {
		return expandTimeline(containerRef);
	}, [expandTimeline]);

	const handleScrollCallback = useCallback(() => {
		handleScroll(containerRef, expandTimelineCallback);
	}, [handleScroll, expandTimelineCallback]);

	// Play/pause controls with Player sync
	const [isPlaying, setIsPlaying] = useState(false);

	const togglePlayback = useCallback(() => {
		const player = playerRef.current;
		if (player) {
			if (player.isPlaying()) {
				player.pause();
				setIsPlaying(false);
			} else {
				player.play();
				setIsPlaying(true);
			}
		}
	}, []);

	// Sync player state with controls - simplified like original
	useEffect(() => {
		const player = playerRef.current;
		if (player) {
			const handlePlay: CallbackListener<"play"> = () => setIsPlaying(true);
			const handlePause: CallbackListener<"pause"> = () => setIsPlaying(false);
			const handleFrameUpdate: CallbackListener<"frameupdate"> = (e) => {
				// Update ruler position from player
				updateRulerFromPlayer(e.detail.frame);
			};

			player.addEventListener("play", handlePlay);
			player.addEventListener("pause", handlePause);
			player.addEventListener("frameupdate", handleFrameUpdate);

			return () => {
				player.removeEventListener("play", handlePlay);
				player.removeEventListener("pause", handlePause);
				player.removeEventListener("frameupdate", handleFrameUpdate);
			};
		}
	}, [updateRulerFromPlayer]);

	// Global spacebar play/pause functionality - like original
	useEffect(() => {
		const handleGlobalKeyPress = (event: KeyboardEvent) => {
			// Only handle spacebar when not focused on input elements
			if (event.code === "Space") {
				const target = event.target as HTMLElement;
				const isInputElement =
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.contentEditable === "true" ||
					target.isContentEditable;

				// If user is typing in an input field, don't interfere
				if (isInputElement) {
					return;
				}

				// Prevent spacebar from scrolling the page
				event.preventDefault();

				const player = playerRef.current;
				if (player) {
					if (player.isPlaying()) {
						player.pause();
					} else {
						player.play();
					}
				}
			}
		};

		// Add event listener to document for global capture
		document.addEventListener("keydown", handleGlobalKeyPress);

		return () => {
			document.removeEventListener("keydown", handleGlobalKeyPress);
		};
	}, []); // Empty dependency array since we're accessing playerRef.current directly

	// Fetch GitHub star count
	useEffect(() => {
		const fetchStarCount = async () => {
			try {
				const response = await fetch("https://api.github.com/repos/robinroy03/videoeditor");
				if (response.ok) {
					const data = await response.json();
					setStarCount(data.stargazers_count);
				}
			} catch (error) {
				console.error("Failed to fetch GitHub stars:", error);
			}
		};

		fetchStarCount();
	}, []);

	// Ruler mouse events
	useEffect(() => {
		if (isDraggingRuler) {
			const handleMouseMove = (e: MouseEvent) => handleRulerMouseMove(e, containerRef);
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleRulerMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleRulerMouseUp);
			};
		}
	}, [isDraggingRuler, handleRulerMouseMove, handleRulerMouseUp]);

	// Timeline wheel zoom functionality
	useEffect(() => {
		const timelineContainer = containerRef.current;
		if (!timelineContainer) return;

		const handleWheel = (e: WheelEvent) => {
			// Only zoom if Ctrl or Cmd is held
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				const scrollDirection = e.deltaY > 0 ? -1 : 1;

				if (scrollDirection > 0) {
					handleZoomIn();
				} else {
					handleZoomOut();
				}
			}
		};

		timelineContainer.addEventListener("wheel", handleWheel, {
			passive: false,
		});
		return () => {
			timelineContainer.removeEventListener("wheel", handleWheel);
		};
	}, [handleZoomIn, handleZoomOut]);

	const { user, isLoading: isAuthLoading, isSigningIn, signInWithGoogle, signOut } = useAuth();

	return (
		<div
			className="h-screen flex flex-col bg-background text-foreground"
			onPointerDown={(e: React.PointerEvent) => {
				if (e.button !== 0) {
					return;
				}
				setSelectedItem(null);
			}}>
			<TopBar
				projectName={projectName}
				onSave={handleSaveTimeline}
				onImport={handleAddMediaClick}
				onExport={handleRender}
				isExporting={isRendering}
				user={user}
				starCount={starCount}
				onSignIn={signInWithGoogle}
				onSignOut={signOut}
			/>

			{/* Main content: Left panel full height, center preview+timeline, right chat always visible */}
			<ResizablePanelGroup direction="horizontal" className="flex-1">
				{/* Left Panel - Media Bin & Tools (full height) */}
				<ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
					<div className="h-full border-r border-border">
						<LeftPanel
							mediaBinItems={mediaBinItems}
							isMediaLoading={isMediaLoading}
							onAddMedia={handleAddMediaToBin}
							onAddText={handleAddTextToBin}
							contextMenu={contextMenu}
							handleContextMenu={handleContextMenu}
							handleDeleteFromContext={handleDeleteFromContext}
							handleSplitAudioFromContext={handleSplitAudioFromContext}
							handleCloseContextMenu={handleCloseContextMenu}
						/>
					</div>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Center Area: Preview and Timeline */}
				<ResizablePanel defaultSize={55}>
					<ResizablePanelGroup direction="vertical">
						{/* Preview Area */}
						<ResizablePanel defaultSize={65} minSize={40}>
							<PreviewArea
								timeline={timeline}
								setResolution={setResolution}
								isAutoSize={isAutoSize}
								setIsAutoSize={setIsAutoSize}
								isChatMinimized={isChatMinimized}
								setIsChatMinimized={setIsChatMinimized}
								timelineData={timelineData}
								durationInFrames={durationInFrames}
								playerRef={playerRef}
								width={width}
								height={height}
								handleUpdateScrubber={handleUpdateScrubber}
								selectedItem={selectedItem}
								setSelectedItem={setSelectedItem}
								getPixelsPerSecond={getPixelsPerSecond}
								isPlaying={isPlaying}
								togglePlayback={togglePlayback}
							/>
						</ResizablePanel>

						<ResizableHandle withHandle />

						{/* Timeline Area */}
						<ResizablePanel defaultSize={35} minSize={25}>
							<TimelineArea
								durationInFrames={durationInFrames}
								pixelsPerSecond={getPixelsPerSecond()}
								timelineWidth={timelineWidth}
								zoomLevel={zoomLevel}
								onZoomIn={handleZoomIn}
								onZoomOut={handleZoomOut}
								onZoomReset={handleZoomReset}
								undo={undo}
								redo={redo}
								canUndo={canUndo}
								canRedo={canRedo}
								onAddTrack={handleAddTrackClick}
								onSplit={handleSplitClick}
								onDebug={handleLogTimelineData}
								containerRef={containerRef}
								rulerPositionPx={rulerPositionPx}
								onRulerDrag={handleRulerDrag}
								onRulerMouseDown={handleRulerMouseDown}
								timeline={timeline}
								onScroll={handleScrollCallback}
								onDeleteTrack={handleDeleteTrack}
								onUpdateScrubber={handleUpdateScrubberWithLocking}
								onDeleteScrubber={handleDeleteScrubber}
								onDropOnTrack={handleDropOnTrack}
								onDropTransition={handleDropTransitionOnTrackWrapper}
								onDeleteTransition={handleDeleteTransition}
								getAllScrubbers={getAllScrubbers}
								expandTimeline={expandTimelineCallback}
								selectedScrubberIds={selectedScrubberIds}
								onSelectScrubber={handleSelectScrubber}
								onGroupScrubbers={handleGroupSelected}
								onUngroupScrubber={handleUngroupSelected}
								onMoveToMediaBin={handleMoveToMediaBinSelected}
								onSnapshot={snapshotTimeline}
							/>
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>

				{/* Right Panel - Chat (toggleable) */}
				{!isChatMinimized && (
					<>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
							<div className="h-full border-l border-border">
								<ChatBox
									mediaBinItems={mediaBinItems}
									handleDropOnTrack={handleDropOnTrack}
									isMinimized={false}
									onToggleMinimize={() => setIsChatMinimized(true)}
									messages={chatMessages}
									onMessagesChange={setChatMessages}
									timelineState={timeline}
									handleUpdateScrubber={handleUpdateScrubberWithLocking}
									handleDeleteScrubber={handleDeleteScrubber}
								/>
							</div>
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				accept="video/*,image/*,audio/*"
				multiple
				className="hidden"
				onChange={handleFileInputChange}
			/>

			{/* Render Status as Toast */}
			{renderStatus && (
				<div className="fixed bottom-4 right-4 z-50">
					<RenderStatus renderStatus={renderStatus} />
				</div>
			)}

			{/* Blocker overlay for unauthenticated users */}
			{!isAuthLoading && !user && (
				<AuthOverlay isLoading={isAuthLoading} isSigningIn={isSigningIn} onSignIn={signInWithGoogle} />
			)}
		</div>
	);
}
