import React from "react";
import { Upload, Download, Save as SaveIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { VividLogo } from "~/components/ui/VividLogo";
import { ProfileMenu } from "~/components/ui/ProfileMenu";

type UserLike = {
	name?: string | null;
	email?: string | null;
	image?: string | null;
};

interface TopBarProps {
	projectName: string;
	onSave: () => void;
	onImport: () => void;
	onExport: () => void;
	isExporting: boolean;
	user: UserLike | null;
	starCount: number | null;
	onSignIn: () => void;
	onSignOut: () => void;
}

export function TopBar({
	projectName,
	onSave,
	onImport,
	onExport,
	isExporting,
	user,
	starCount,
	onSignIn,
	onSignOut,
}: TopBarProps) {
	return (
		<header className="h-9 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-3 shrink-0">
			<div className="flex items-center gap-2">
				<VividLogo className="h-6 w-6" showText={false} />
				<span className="font-semibold">Vivid Studio</span>
			</div>

			{/* Center project name */}
			<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
				<span className="text-xs leading-none text-muted-foreground font-mono">
					{projectName || "Project"}
				</span>
			</div>

			<div className="flex items-center gap-1">
				{/* Save / Import / Export */}
				<Button
					variant="ghost"
					size="sm"
					onClick={onSave}
					className="h-7 px-2 text-xs"
					title="Save timeline (Ctrl/Cmd+S)"
				>
					<SaveIcon className="h-3 w-3 mr-1" />
					Save
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onClick={onImport}
					className="h-7 px-2 text-xs"
				>
					<Upload className="h-3 w-3 mr-1" />
					Import
				</Button>

				<Button
					variant="default"
					size="sm"
					onClick={onExport}
					disabled={isExporting}
					className="h-7 px-2 text-xs"
				>
					<Download className="h-3 w-3 mr-1" />
					{isExporting ? "Rendering..." : "Export"}
				</Button>

				{/* Auth status — keep avatar as the last item (right corner) */}
				{user ? (
					<ProfileMenu user={user} starCount={starCount} onSignOut={onSignOut} />
				) : (
					<Button
						variant="ghost"
						size="sm"
						onClick={onSignIn}
						className="h-7 px-2 text-xs ml-1"
						title="Sign in with Google"
					>
						Sign in
					</Button>
				)}
			</div>
		</header>
	);
}
