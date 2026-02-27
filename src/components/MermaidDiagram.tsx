'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
  }, []);

  useEffect(() => {
    if (isModalOpen && svg) {
      // Small delay to ensure modal is rendered and dimensions are stable
      const timer = setTimeout(() => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, "image/svg+xml");
          const svgEl = doc.querySelector('svg');
          
          if (svgEl) {
            let width = parseFloat(svgEl.getAttribute('width') || '0');
            let height = parseFloat(svgEl.getAttribute('height') || '0');
            const viewBox = svgEl.getAttribute('viewBox');
            
            // Prefer viewBox for dimensions if available as it represents the true coordinate space
            if (viewBox) {
              const parts = viewBox.split(/\s+/).map(Number);
              if (parts.length === 4) {
                width = parts[2];
                height = parts[3];
              }
            }

            if (width && height) {
              setDimensions({ width, height });
              const padding = 1;
              const availableWidth = window.innerWidth - padding * 2;
              const availableHeight = window.innerHeight - padding * 2;
              
              const scaleX = availableWidth / width;
              const scaleY = availableHeight / height;
              
              // Use Math.max to ensure the diagram fills at least one dimension of the screen
              // This is better for wide/short or tall/narrow diagrams
              let optimalScale = Math.max(scaleX, scaleY);
              
              // Cap auto-zoom at 3x to prevent extreme pixelation on small diagrams
              if (optimalScale > 3) {
                optimalScale = 3;
              }
              
              // For very large diagrams, don't shrink too aggressively (keep at least 20% size)
              if (optimalScale < 0.2) {
                optimalScale = 0.2;
              }

              setScale(optimalScale);
            } else {
                setScale(1);
            }
          }
        } catch (e) {
          console.error("Error calculating optimal scale:", e);
          setScale(10);
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, svg]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        // Remove max-width style if present to allow proper scaling in modal
        // Mermaid often adds a max-width based on the container, which limits zooming/growth
        setSvg(svg.replace(/max-width:[^;"]+;?/g, ''));
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        // Try to fix common syntax errors automatically
        try {
            // Attempt 1: Fix unescaped parentheses in node labels by wrapping content in quotes
            // This regex looks for node definitions like id[content] or id(content) and quotes the content if it contains ( or )
            // Note: This is a simple heuristic and might not cover all cases
            const fixedChart = chart.replace(/([A-Za-z0-9_]+)(\[|\(|\{)([^\]\)\}"']*[()][^\]\)\}"']*)(\]|\)|\})/g, (match, id, open, content, close) => {
                 return `${id}${open}"${content.replace(/"/g, "'")}"${close}`;
            });
            
            if (fixedChart !== chart) {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, fixedChart);
                setSvg(svg.replace(/max-width:[^;"]+;?/g, ''));
                setError(null);
                return;
            }
        } catch (retryErr) {
             console.error('Mermaid retry failed:', retryErr);
        }

        setError('Failed to render diagram');
      }
    };

    renderChart();
  }, [chart]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    // Scale will be calculated by the effect when opening
  };

  const handleZoomIn = () => setScale(prev => prev + 0.5);
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.1));
  const handleResetZoom = () => setScale(1);

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        {error}
        <pre className="mt-2 text-xs overflow-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      <div className="relative group my-6">
        <div 
          ref={containerRef}
          className="mermaid-diagram overflow-x-auto flex justify-center bg-white p-4 rounded-lg bg-opacity-50 min-h-[100px]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <button 
            onClick={toggleModal}
            className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm border rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            title="Enlarge diagram"
        >
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
             {/* Toolbar */}
             <div className="absolute top-4 right-4 flex items-center gap-2 z-10 bg-card border shadow-sm rounded-lg p-1">
                <button 
                  onClick={handleZoomOut} 
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Zoom Out"
                >
                    <ZoomOut className="h-4 w-4" />
                </button>
                <div className="text-xs font-mono w-12 text-center select-none">
                    {Math.round(scale * 100)}%
                </div>
                <button 
                  onClick={handleZoomIn} 
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Zoom In"
                >
                    <ZoomIn className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button 
                  onClick={handleResetZoom} 
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset Zoom"
                >
                    <RotateCcw className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button 
                  onClick={toggleModal} 
                  className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  title="Close"
                >
                    <X className="h-4 w-4" />
                </button>
             </div>

             {/* Content Area - Fix for scrolling issue: Use flex + margin:auto on a sized container */}
             <div className="w-full h-full overflow-auto bg-dot-pattern flex items-start justify-start"> 
                <div 
                    className="m-auto bg-white p-8 rounded-lg shadow-sm transition-transform duration-200"
                    style={{ 
                        // Wrapper size includes padding (p-8 = 2rem * 2 = 64px) + scaled content
                        width: dimensions.width ? (dimensions.width * scale) + 64 : 'auto',
                        height: dimensions.height ? (dimensions.height * scale) + 64 : 'auto',
                        minWidth: 'min-content',
                        minHeight: 'min-content',
                        display: 'flex',
                        // Align top-left so transform-origin "top left" works predictably
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start', 
                    }}
                >
                    <div 
                        style={{
                            width: dimensions.width,
                            height: dimensions.height,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left', // This is safer for overflow handling
                        // Reset max-width to ensure layout size is preserved for correct scaling
                        maxWidth: 'none',
                        maxHeight: 'none',
                        }}
                        dangerouslySetInnerHTML={{ __html: svg }}
                    />
                </div>
             </div>
        </div>
      )}
    </>
  );
};

export default MermaidDiagram;
