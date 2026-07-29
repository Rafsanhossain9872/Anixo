import React, { useEffect, useRef } from 'react';

export function AdBanner728x90() {
  const containerRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let timeoutId;

    const loadAd = () => {
      if (loadedRef.current || !containerRef.current) return;
      loadedRef.current = true;

      const container = containerRef.current;
      container.innerHTML = '';

      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.maxWidth = '728px';
      iframe.style.height = '90px';
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.scrolling = 'no';
      iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      container.appendChild(iframe);

      const adKey = '98cb9789d3be273d73a20c5472affbc8';
      const adDomain = 'www.highperformanceformat.com';

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html><head><style>body{margin:0;padding:0;overflow:hidden;width:100%;height:100%;}</style></head>
        <body>
          <script>
            atOptions = {
              'key' : '${adKey}',
              'format' : 'iframe',
              'height' : 90,
              'width' : 728,
              'params' : {}
            };
          </script>
          <script src="https://${adDomain}/${adKey}/invoke.js"></script>
        </body></html>
      `);
      iframeDoc.close();
    };

    timeoutId = setTimeout(loadAd, 100);

    return () => {
      clearTimeout(timeoutId);
      loadedRef.current = false;
    };
  }, [window.location.hostname]);

  return (
    <div className="w-full flex justify-center py-3 overflow-hidden">
      <div ref={containerRef} className="w-full max-w-[728px]" />
    </div>
  );
}

export function AdBanner300x250() {
  const containerRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let timeoutId;

    const loadAd = () => {
      if (loadedRef.current || !containerRef.current) return;
      loadedRef.current = true;

      const container = containerRef.current;
      container.innerHTML = '';

      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.maxWidth = '300px';
      iframe.style.height = '250px';
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.scrolling = 'no';
      iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      container.appendChild(iframe);

      const adKey = 'a1588ab19bd492d10d370d7362724ae6';
      const adDomain = 'www.highperformanceformat.com';

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html><head><style>body{margin:0;padding:0;overflow:hidden;width:100%;height:100%;}</style></head>
        <body>
          <script>
            atOptions = {
              'key' : '${adKey}',
              'format' : 'iframe',
              'height' : 250,
              'width' : 300,
              'params' : {}
            };
          </script>
          <script src="https://${adDomain}/${adKey}/invoke.js"></script>
        </body></html>
      `);
      iframeDoc.close();
    };


    timeoutId = setTimeout(loadAd, 100);

    return () => {
      clearTimeout(timeoutId);
      loadedRef.current = false;
    };
  }, [window.location.hostname]);

  return (
    <div className="w-full flex justify-center py-3 overflow-hidden">
      <div ref={containerRef} className="w-full max-w-[300px]" />
    </div>
  );
}

export function AdNativeBanner() {
  // Hidden by user request
  return null;
}

// PopAds Banner Component (Add your PopAds banner code here if needed)
export function PopAdsBanner() {
  const containerRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || !containerRef.current) return;
    loadedRef.current = true;

    // Add your PopAds banner code here when you get it
    // For now, this is a placeholder

    return () => {
      loadedRef.current = false;
    };
  }, [window.location.hostname]);

  return (
    <div className="w-full flex justify-center py-4 overflow-hidden">
      <div ref={containerRef} />
    </div>
  );
}
