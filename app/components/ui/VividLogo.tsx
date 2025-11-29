import * as React from "react";

interface VividLogoProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string;
	showText?: boolean;
}

export const VividLogo: React.FC<VividLogoProps> = ({
	className = "",
	showText = true,
	...rest
}) => {
	return (
		<div className={`flex items-center gap-2 ${className}`} {...rest}>
			<img src="/logo.png" alt="Vivid Studio Logo" className="h-8 w-8 object-contain" />
			{showText && (
				<span className="font-extrabold text-sm uppercase tracking-widest">
					Vivid Studio
				</span>
			)}
		</div>
	);
};

export default VividLogo;
