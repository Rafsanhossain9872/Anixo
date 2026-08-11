import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const steps = [
    {
        title: "Step 1: Open Site Settings",
        description: "Click on the lock icon or site settings icon next to the URL in your browser.",
        image: "/step1.png"
    },
    {
        title: "Step 2: Go to Cookies and Site Data",
        description: "Select 'Cookies and site data' from the dropdown menu.",
        image: "/step2.png" 
    },
    {
        title: "Step 3: Manage Site Data",
        description: "Click on the 'Manage on-device site data' button.",
        image: "/step3.png" 
    },
    {
        title: "Step 4: Confirm",
        description: "Confirm your action to delete the cache. Then refresh the page!",
        image: "/step4.png"
    }
];

export default function CacheGuideModal({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    // Reset step when modal is closed
    const handleClose = () => {
        onClose();
        setTimeout(() => setCurrentStep(0), 300);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1A1D24] border border-white/10 w-full max-w-xl rounded-lg shadow-xl overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#1A1D24]">
                    <h2 className="text-base font-semibold text-white/90">How to Clear Cache</h2>
                    <button 
                        onClick={handleClose}
                        className="text-white/40 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="flex flex-col items-center">
                        <div className="w-full bg-[#12151C] rounded-md mb-5 overflow-hidden flex items-center justify-center border border-white/5 py-4">
                            <img 
                                src={steps[currentStep].image} 
                                alt={`Step ${currentStep + 1}`} 
                                className="max-h-[250px] object-contain"
                            />
                        </div>
                        <h3 className="text-lg font-semibold text-white/90 mb-1 text-center">{steps[currentStep].title}</h3>
                        <p className="text-white/50 text-sm text-center mb-6">{steps[currentStep].description}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <button 
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${currentStep === 0 ? 'text-white/20 cursor-not-allowed' : 'text-white/70 hover:bg-white/10'}`}
                        >
                            <ChevronLeft size={16} /> Back
                        </button>

                        <span className="text-white/40 text-xs font-medium tracking-wide">
                            STEP {currentStep + 1} OF {steps.length}
                        </span>

                        <button 
                            onClick={currentStep === steps.length - 1 ? handleClose : nextStep}
                            className={`flex items-center gap-1 px-4 py-1.5 text-sm rounded transition-colors ${currentStep === steps.length - 1 ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-white/10 text-white/90 hover:bg-white/20'}`}
                        >
                            {currentStep === steps.length - 1 ? 'Done' : 'Next'} {currentStep !== steps.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
