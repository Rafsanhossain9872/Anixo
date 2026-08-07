export const parseBasicMarkdown = (text) => {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\b((?:[0-9]+:)?[0-5]?[0-9]:[0-5][0-9])\b/g, '<button class="timestamp-link text-[#00B4D8] hover:underline cursor-pointer" data-time="$1">$1</button>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/^&gt; (.*?)$/gm, '<blockquote class="border-l-2 border-indigo-500 pl-2 ml-1 text-white/60 italic my-1">$1</blockquote>')
        .replace(/(https:\/\/(?:[a-zA-Z0-9-]+\.)*(?:giphy\.com|tenor\.com)\/[^\s"'<>]+)/ig, '<img src="$1" class="rounded-lg max-w-[250px] mt-2 mb-2 block border border-white/5" alt="GIF" />')
        .replace(/\n/g, '<br/>');
};
