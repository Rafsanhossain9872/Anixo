import React, { useState } from "react";
import { SpoilerText } from "./SpoilerText";
import { parseBasicMarkdown } from "./utils";

export const CommentBody = ({ content, isSpoiler }) => {
    const [expanded, setExpanded] = useState(false);

    if (!content) return null;
    
    if (isSpoiler) {
        return <SpoilerText text={parseBasicMarkdown(content)} />;
    }

    const MAX_LENGTH = 300;
    const MAX_LINES = 5;
    
    const lines = content.split('\n');
    const isLong = content.length > MAX_LENGTH || lines.length > MAX_LINES;
    
    let displayContent = content;
    if (isLong && !expanded) {
        if (lines.length > MAX_LINES) {
            displayContent = lines.slice(0, MAX_LINES).join('\n') + '...';
        } else if (content.length > MAX_LENGTH) {
            displayContent = content.substring(0, MAX_LENGTH) + '...';
        }
    }

    const renderContent = (text) => {
        if (!text.includes('||')) {
            return <span dangerouslySetInnerHTML={{ __html: parseBasicMarkdown(text) }} />;
        }
        const parts = text.split('||');
        return (
            <span>
                {parts.map((part, index) => {
                    if (index % 2 === 0) {
                        return <span key={index} dangerouslySetInnerHTML={{ __html: parseBasicMarkdown(part) }} />;
                    } else {
                        return <SpoilerText key={index} text={parseBasicMarkdown(part)} />;
                    }
                })}
            </span>
        );
    };

    return (
        <>
            {renderContent(displayContent)}
            {isLong && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="block text-white/50 hover:text-white text-xs font-bold mt-1.5 cursor-pointer transition-colors"
                >
                    {expanded ? 'Show less' : 'Read more'}
                </button>
            )}
        </>
    );
};
