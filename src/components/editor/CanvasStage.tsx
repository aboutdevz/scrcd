import React, { useRef, useState, useEffect } from 'react';
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle,
  Arrow,
  Rect,
  Ellipse,
  Text,
  Line,
  Group,
} from 'react-konva';
import { Step, AnnotationShape, AnnotationTool } from '@/types';

interface CanvasStageProps {
  step: Step;
  activeTool: AnnotationTool;
  toolColor: string;
  strokeWidth: number;
  blurIntensity: number;
  onUpdateStep: (updated: Step) => void;
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  step,
  activeTool,
  toolColor,
  strokeWidth,
  blurIntensity,
  onUpdateStep,
  selectedShapeId,
  onSelectShape,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<any>(null);

  // Load screenshot
  useEffect(() => {
    if (!step.screenshotPath) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = step.screenshotPath;
    img.onload = () => {
      setImage(img);
      // Fit to container on first load
      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth - 40;
        const containerH = containerRef.current.clientHeight - 40;
        const scaleX = containerW / img.width;
        const scaleY = containerH / img.height;
        const fitScale = Math.min(scaleX, scaleY, 1);
        setScale(fitScale);
        setPosition({
          x: Math.max(20, (containerRef.current.clientWidth - img.width * fitScale) / 2),
          y: Math.max(20, (containerRef.current.clientHeight - img.height * fitScale) / 2),
        });
      }
    };
  }, [step.id, step.screenshotPath]);

  // Stage Mouse Down for drawing new shapes
  const handleMouseDown = (e: any) => {
    // If clicked on empty space, deselect
    if (e.target === e.target.getStage()) {
      onSelectShape(null);
    }

    if (activeTool === 'select') return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to canvas image coordinates
    const stageX = (pointer.x - position.x) / scale;
    const stageY = (pointer.y - position.y) / scale;

    setIsDrawing(true);
    const newId = `shape_${Date.now()}`;

    if (activeTool === 'hotspot') {
      const nextNum = (step.annotations.filter((a) => a.type === 'hotspot').length || 0) + 1;
      const newHotspot: AnnotationShape = {
        id: newId,
        type: 'hotspot',
        x: stageX,
        y: stageY,
        number: nextNum,
        color: toolColor,
      };
      onUpdateStep({
        ...step,
        annotations: [...step.annotations, newHotspot],
      });
      setIsDrawing(false);
      onSelectShape(newId);
    } else if (activeTool === 'arrow') {
      setCurrentShape({
        id: newId,
        type: 'arrow',
        points: [stageX, stageY, stageX, stageY],
        color: toolColor,
        strokeWidth,
      });
    } else if (activeTool === 'rect') {
      setCurrentShape({
        id: newId,
        type: 'rect',
        x: stageX,
        y: stageY,
        width: 0,
        height: 0,
        strokeColor: toolColor,
        strokeWidth,
        fillColor: 'transparent',
      });
    } else if (activeTool === 'oval') {
      setCurrentShape({
        id: newId,
        type: 'oval',
        x: stageX,
        y: stageY,
        radiusX: 0,
        radiusY: 0,
        strokeColor: toolColor,
        strokeWidth,
      });
    } else if (activeTool === 'text') {
      const newText: AnnotationShape = {
        id: newId,
        type: 'text',
        x: stageX,
        y: stageY,
        text: 'Action Label',
        fontSize: 16,
        color: toolColor,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
      };
      onUpdateStep({
        ...step,
        annotations: [...step.annotations, newText],
      });
      setIsDrawing(false);
      onSelectShape(newId);
    } else if (activeTool === 'highlighter') {
      setCurrentShape({
        id: newId,
        type: 'highlighter',
        points: [stageX, stageY],
        color: toolColor,
        strokeWidth: strokeWidth * 3,
      });
    } else if (activeTool === 'blur') {
      setCurrentShape({
        id: newId,
        type: 'blur',
        x: stageX,
        y: stageY,
        width: 0,
        height: 0,
        intensity: blurIntensity,
      });
    } else if (activeTool === 'redact') {
      setCurrentShape({
        id: newId,
        type: 'redact',
        x: stageX,
        y: stageY,
        width: 0,
        height: 0,
        fillColor: '#000000',
      });
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !currentShape) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const stageX = (pointer.x - position.x) / scale;
    const stageY = (pointer.y - position.y) / scale;

    if (currentShape.type === 'arrow') {
      setCurrentShape({
        ...currentShape,
        points: [currentShape.points[0], currentShape.points[1], stageX, stageY],
      });
    } else if (currentShape.type === 'rect' || currentShape.type === 'blur' || currentShape.type === 'redact') {
      setCurrentShape({
        ...currentShape,
        width: stageX - currentShape.x,
        height: stageY - currentShape.y,
      });
    } else if (currentShape.type === 'oval') {
      setCurrentShape({
        ...currentShape,
        radiusX: Math.abs(stageX - currentShape.x),
        radiusY: Math.abs(stageY - currentShape.y),
      });
    } else if (currentShape.type === 'highlighter') {
      setCurrentShape({
        ...currentShape,
        points: [...currentShape.points, stageX, stageY],
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentShape) {
      onUpdateStep({
        ...step,
        annotations: [...step.annotations, currentShape],
      });
      onSelectShape(currentShape.id);
      setCurrentShape(null);
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(0.2, prev + delta), 3));
  };

  const resetZoom = () => {
    if (!image || !containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 40;
    const containerH = containerRef.current.clientHeight - 40;
    const fitScale = Math.min(containerW / image.width, containerH / image.height, 1);
    setScale(fitScale);
    setPosition({
      x: Math.max(20, (containerRef.current.clientWidth - image.width * fitScale) / 2),
      y: Math.max(20, (containerRef.current.clientHeight - image.height * fitScale) / 2),
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none"
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          handleZoom(e.deltaY < 0 ? 0.05 : -0.05);
        }
      }}
    >
      <Stage
        width={containerRef.current?.clientWidth || 1000}
        height={containerRef.current?.clientHeight || 600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={activeTool === 'select'}
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        onDragEnd={(e) => {
          if (activeTool === 'select' && e.target === e.target.getStage()) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Base Screenshot Image */}
          {image && <KonvaImage image={image} width={image.width} height={image.height} />}

          {/* Render Saved Annotations */}
          {step.annotations.map((shape) => {
            const isSelected = selectedShapeId === shape.id;

            if (shape.type === 'hotspot') {
              return (
                <Group
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                >
                  {/* Outer Pulse Ring */}
                  <Circle
                    radius={20}
                    fill={shape.color || '#2563eb'}
                    opacity={0.3}
                  />
                  {/* Main Badge */}
                  <Circle
                    radius={14}
                    fill={shape.color || '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth={2}
                    shadowColor="rgba(0,0,0,0.5)"
                    shadowBlur={6}
                  />
                  {/* Step Number */}
                  <Text
                    text={`${shape.number}`}
                    fontSize={12}
                    fontStyle="bold"
                    fill="#ffffff"
                    x={-6}
                    y={-6}
                    align="center"
                    verticalAlign="middle"
                  />
                </Group>
              );
            }

            if (shape.type === 'arrow') {
              return (
                <Arrow
                  key={shape.id}
                  points={shape.points}
                  stroke={shape.color || '#2563eb'}
                  fill={shape.color || '#2563eb'}
                  strokeWidth={shape.strokeWidth || 3}
                  pointerLength={12}
                  pointerWidth={10}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                />
              );
            }

            if (shape.type === 'rect') {
              return (
                <Rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  stroke={shape.strokeColor || '#2563eb'}
                  strokeWidth={shape.strokeWidth || 3}
                  fill={shape.fillColor || 'transparent'}
                  cornerRadius={4}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                />
              );
            }

            if (shape.type === 'oval') {
              return (
                <Ellipse
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radiusX={shape.radiusX}
                  radiusY={shape.radiusY}
                  stroke={shape.strokeColor || '#2563eb'}
                  strokeWidth={shape.strokeWidth || 3}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                />
              );
            }

            if (shape.type === 'text') {
              return (
                <Group
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                >
                  <Rect
                    width={120}
                    height={30}
                    fill={shape.backgroundColor || 'rgba(15, 23, 42, 0.9)'}
                    cornerRadius={6}
                    stroke={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={1}
                  />
                  <Text
                    text={shape.text}
                    fontSize={shape.fontSize || 14}
                    fill={shape.color || '#ffffff'}
                    padding={6}
                  />
                </Group>
              );
            }

            if (shape.type === 'highlighter') {
              return (
                <Line
                  key={shape.id}
                  points={shape.points}
                  stroke={shape.color || '#facc15'}
                  strokeWidth={shape.strokeWidth || 12}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.4}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                />
              );
            }

            if (shape.type === 'blur') {
              return (
                <Rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill="rgba(148, 163, 184, 0.75)"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  dash={[4, 4]}
                  cornerRadius={4}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                />
              );
            }

            if (shape.type === 'redact') {
              return (
                <Rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill="#000000"
                  cornerRadius={2}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                />
              );
            }

            return null;
          })}

          {/* Currently Drawing Shape Preview */}
          {currentShape && (
            <>
              {currentShape.type === 'arrow' && (
                <Arrow
                  points={currentShape.points}
                  stroke={currentShape.color}
                  fill={currentShape.color}
                  strokeWidth={currentShape.strokeWidth}
                  pointerLength={12}
                  pointerWidth={10}
                />
              )}
              {currentShape.type === 'rect' && (
                <Rect
                  x={currentShape.x}
                  y={currentShape.y}
                  width={currentShape.width}
                  height={currentShape.height}
                  stroke={currentShape.strokeColor}
                  strokeWidth={currentShape.strokeWidth}
                  fill="transparent"
                  cornerRadius={4}
                />
              )}
              {currentShape.type === 'oval' && (
                <Ellipse
                  x={currentShape.x}
                  y={currentShape.y}
                  radiusX={currentShape.radiusX}
                  radiusY={currentShape.radiusY}
                  stroke={currentShape.strokeColor}
                  strokeWidth={currentShape.strokeWidth}
                />
              )}
              {currentShape.type === 'highlighter' && (
                <Line
                  points={currentShape.points}
                  stroke={currentShape.color}
                  strokeWidth={currentShape.strokeWidth}
                  opacity={0.4}
                />
              )}
              {currentShape.type === 'blur' && (
                <Rect
                  x={currentShape.x}
                  y={currentShape.y}
                  width={currentShape.width}
                  height={currentShape.height}
                  fill="rgba(148, 163, 184, 0.75)"
                  stroke="#94a3b8"
                  dash={[4, 4]}
                />
              )}
              {currentShape.type === 'redact' && (
                <Rect
                  x={currentShape.x}
                  y={currentShape.y}
                  width={currentShape.width}
                  height={currentShape.height}
                  fill="#000000"
                />
              )}
            </>
          )}
        </Layer>
      </Stage>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 text-xs shadow-xl text-slate-300">
        <button
          onClick={() => handleZoom(-0.1)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 rounded font-bold"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={resetZoom}
          className="px-2 h-7 flex items-center justify-center hover:bg-slate-800 rounded tabular-nums font-mono text-[11px]"
          title="Reset to Fit"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => handleZoom(0.1)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 rounded font-bold"
          title="Zoom In"
        >
          +
        </button>
      </div>
    </div>
  );
};
