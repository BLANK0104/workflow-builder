'use client';

interface LoadingSpinnerProps {
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
}

export default function LoadingSpinner({ currentStep = 0, totalSteps = 0, stepName = '' }: LoadingSpinnerProps) {
  const hasProgress = totalSteps > 0;
  const progress = hasProgress ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl flex flex-col items-center max-w-md w-full mx-4">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">Processing Workflow...</p>
        
        {hasProgress ? (
          <>
            <div className="w-full mt-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            {stepName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                {stepName}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">This may take a few moments</p>
        )}
      </div>
    </div>
  );
}
