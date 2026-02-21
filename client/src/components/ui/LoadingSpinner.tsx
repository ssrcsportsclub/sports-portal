import React from "react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullScreen = false,
}) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
    : "flex items-center justify-center p-12 w-full h-full min-h-[200px] bg-transparent";

  return (
    <div className={containerClasses}>
      <div className="relative w-12 h-12">
        {/* Track */}
        <div className="absolute inset-0 border-[3px] border-white/5 rounded-full"></div>
        {/* Spinner */}
        <div className="absolute inset-0 border-[3px] border-[#DD1D25] border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
