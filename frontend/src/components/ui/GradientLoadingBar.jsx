import React from 'react';
import { motion } from 'framer-motion';

const GradientLoadingBar = () => {
    return (
        <div className="w-full h-1 bg-app-surface overflow-hidden relative rounded-full">
            <motion.div
                className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                initial={{ left: '-50%' }}
                animate={{ left: '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                }}
            />
        </div>
    );
};

export default GradientLoadingBar;
