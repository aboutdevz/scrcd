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
  Path,
  Transformer,
} from 'react-konva';
import { Step, AnnotationShape, AnnotationTool, BlurShape } from '@/types';

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

interface PixelatedBlurShapeProps {
  shape: BlurShape;
  sourceImage: HTMLImageElement | null;
  isSelected: boolean;
  activeTool: AnnotationTool;
  onSelect: () => void;
  onTransformEnd: (e: any) => void;
  onDragEnd: (e: any) => void;
}

const PixelatedBlurShape: React.FC<PixelatedBlurShapeProps> = ({
  shape,
  sourceImage,
  isSelected,
  activeTool,
  onSelect,
  onTransformEnd,
  onDragEnd,
}) => {
  const [blurCanvas, setBlurCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!sourceImage || !shape.width || !shape.height) return;
    const w = Math.max(2, Math.round(shape.width));
    const h = Math.max(2, Math.round(shape.height));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgW = sourceImage.naturalWidth || sourceImage.width;
    const imgH = sourceImage.naturalHeight || sourceImage.height;

    const sx = Math.max(0, Math.min(shape.x, imgW - 1));
    const sy = Math.max(0, Math.min(shape.y, imgH - 1));
    const sw = Math.max(1, Math.min(shape.width, imgW - sx));
    const sh = Math.max(1, Math.min(shape.height, imgH - sy));

    // Heavy mosaic downscale (block size ~14px):
    const blockSize = Math.max(12, Math.round(Math.min(sw, sh) / 5));
    const tw = Math.max(2, Math.floor(sw / blockSize));
    const th = Math.max(2, Math.floor(sh / blockSize));

    const tiny = document.createElement('canvas');
    tiny.width = tw;
    tiny.height = th;
    const tctx = tiny.getContext('2d');
    if (tctx) {
      tctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, tw, th);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tiny, 0, 0, tw, th, 0, 0, w, h);

      // Frosted privacy overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, 0, w, h);
    }

    setBlurCanvas(canvas);
  }, [sourceImage, shape.x, shape.y, shape.width, shape.height]);

  return (
    <Group
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      draggable={activeTool === 'select'}
      onClick={onSelect}
      onTransformEnd={onTransformEnd}
      onDragEnd={onDragEnd}
    >
      {blurCanvas ? (
        <KonvaImage
          image={blurCanvas}
          width={shape.width}
          height={shape.height}
          cornerRadius={3}
        />
      ) : (
        <Rect
          width={shape.width}
          height={shape.height}
          fill="rgba(15, 23, 42, 0.98)"
          cornerRadius={3}
        />
      )}
      <Rect
        width={shape.width}
        height={shape.height}
        stroke={isSelected ? '#38bdf8' : '#94a3b8'}
        strokeWidth={1.5}
        dash={[4, 4]}
        cornerRadius={3}
      />
    </Group>
  );
};

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
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

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

  // Attach Transformer to selected shape
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedShapeId && activeTool === 'select') {
      const selectedNode = stageRef.current.findOne('#' + selectedShapeId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer()?.batchDraw();
      } else {
        trRef.current.nodes([]);
      }
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedShapeId, activeTool, step.annotations]);

  // Stage Mouse Down for drawing new shapes
  const handleMouseDown = (e: any) => {
    if (e.target === e.target.getStage() || (image && e.target === e.target.getStage().findOne('Image'))) {
      onSelectShape(null);
    }

    if (activeTool === 'select') return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

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
        color: toolColor || '#f59e0b',
        variant: 'spotlight',
        radius: 34,
      };
      onUpdateStep({
        ...step,
        annotations: [...step.annotations, newHotspot],
      });
      setIsDrawing(false);
      onSelectShape(newId);
      return;
    }

    if (activeTool === 'arrow') {
      setCurrentShape({
        id: newId,
        type: 'arrow',
        points: [stageX, stageY, stageX, stageY],
        color: toolColor,
        strokeWidth,
      });
      return;
    }

    if (activeTool === 'rect') {
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
      return;
    }

    if (activeTool === 'oval') {
      setCurrentShape({
        id: newId,
        type: 'oval',
        x: stageX,
        y: stageY,
        radiusX: 0,
        radiusY: 0,
        strokeColor: toolColor,
        strokeWidth,
        fillColor: 'transparent',
      });
      return;
    }

    if (activeTool === 'text') {
      const newText: AnnotationShape = {
        id: newId,
        type: 'text',
        x: stageX,
        y: stageY,
        text: 'Type instruction here...',
        fontSize: 14,
        color: '#ffffff',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
      };
      onUpdateStep({
        ...step,
        annotations: [...step.annotations, newText],
      });
      setIsDrawing(false);
      onSelectShape(newId);
      return;
    }

    if (activeTool === 'highlighter') {
      setCurrentShape({
        id: newId,
        type: 'highlighter',
        points: [stageX, stageY],
        color: toolColor,
        strokeWidth: strokeWidth * 3,
      });
      return;
    }

    if (activeTool === 'blur') {
      setCurrentShape({
        id: newId,
        type: 'blur',
        x: stageX,
        y: stageY,
        width: 0,
        height: 0,
        intensity: blurIntensity,
      });
      return;
    }

    if (activeTool === 'redact') {
      setCurrentShape({
        id: newId,
        type: 'redact',
        x: stageX,
        y: stageY,
        width: 0,
        height: 0,
        fillColor: '#000000',
      });
      return;
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

  // Handle transform changes
  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const shapeId = node.id();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const updated = step.annotations.map((a) => {
      if (a.id === shapeId) {
        if (a.type === 'rect' || a.type === 'blur' || a.type === 'redact') {
          return {
            ...a,
            x: node.x(),
            y: node.y(),
            width: Math.max(10, Math.round(node.width() * scaleX)),
            height: Math.max(10, Math.round(node.height() * scaleY)),
          };
        }
        if (a.type === 'oval') {
          return {
            ...a,
            x: node.x(),
            y: node.y(),
            radiusX: Math.max(5, Math.round(node.radiusX() * scaleX)),
            radiusY: Math.max(5, Math.round(node.radiusY() * scaleY)),
          };
        }
        if (a.type === 'hotspot') {
          const newRadius = Math.max(16, Math.round((a.radius || 34) * scaleX));
          return {
            ...a,
            x: node.x(),
            y: node.y(),
            radius: newRadius,
          };
        }
        return { ...a, x: node.x(), y: node.y() };
      }
      return a;
    });

    onUpdateStep({ ...step, annotations: updated });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-slate-900/90 overflow-hidden flex items-center justify-center select-none"
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          handleZoom(e.deltaY < 0 ? 0.05 : -0.05);
        }
      }}
    >
      <Stage
        ref={stageRef}
        width={containerRef.current?.clientWidth || 1000}
        height={containerRef.current?.clientHeight || 600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={activeTool === 'select' && !selectedShapeId}
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
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
              const radius = shape.radius || 34;
              const isBadge = shape.variant === 'badge';

              return (
                <Group
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                >
                  {/* Folge-style Glowing Translucent Spotlight Circle */}
                  <Circle
                    radius={radius}
                    fill={shape.color ? `${shape.color}44` : 'rgba(245, 158, 11, 0.45)'}
                    stroke={shape.color || '#f59e0b'}
                    strokeWidth={1.5}
                    shadowColor={shape.color || '#f59e0b'}
                    shadowBlur={8}
                    shadowOpacity={0.5}
                  />

                  {/* Inner Content: Hand Cursor (Default) OR Numbered Badge */}
                  {isBadge ? (
                    <>
                      <Circle
                        radius={16}
                        fill={shape.color || '#2563eb'}
                        stroke="#ffffff"
                        strokeWidth={2}
                        shadowColor="rgba(0,0,0,0.5)"
                        shadowBlur={6}
                      />
                      <Text
                        text={`${shape.number}`}
                        fontSize={13}
                        fontStyle="bold"
                        fill="#ffffff"
                        x={-6}
                        y={-6}
                        align="center"
                        verticalAlign="middle"
                      />
                    </>
                  ) : (
                    /* Folge-style Pointer Cursor Icon */
                    <Group x={-2} y={-2} scaleX={1.3} scaleY={1.3}>
                      {/* Drop shadow */}
                      <Path
                        data="M0 0 L0 16 L4 12 L7 19 L9.5 18 L6.5 11 L11.5 11 Z"
                        fill="rgba(0,0,0,0.4)"
                        x={1.5}
                        y={1.5}
                      />
                      {/* Main White Cursor with Dark Border */}
                      <Path
                        data="M0 0 L0 16 L4 12 L7 19 L9.5 18 L6.5 11 L11.5 11 Z"
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth={1.2}
                        lineJoin="round"
                      />
                    </Group>
                  )}
                </Group>
              );
            }

            if (shape.type === 'arrow') {
              return (
                <Arrow
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.color || '#2563eb'}
                  fill={shape.color || '#2563eb'}
                  strokeWidth={shape.strokeWidth || 3}
                  pointerLength={14}
                  pointerWidth={12}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onDragEnd={(e) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    e.target.x(0);
                    e.target.y(0);
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id && a.type === 'arrow'
                        ? {
                            ...a,
                            points: [
                              a.points[0] + dx,
                              a.points[1] + dy,
                              a.points[2] + dx,
                              a.points[3] + dy,
                            ] as [number, number, number, number],
                          }
                        : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                />
              );
            }

            if (shape.type === 'rect') {
              return (
                <Rect
                  key={shape.id}
                  id={shape.id}
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
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                />
              );
            }

            if (shape.type === 'oval') {
              return (
                <Ellipse
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radiusX={shape.radiusX}
                  radiusY={shape.radiusY}
                  stroke={shape.strokeColor || '#2563eb'}
                  strokeWidth={shape.strokeWidth || 3}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                />
              );
            }

            if (shape.type === 'text') {
              return (
                <Group
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                >
                  <Rect
                    width={160}
                    height={36}
                    fill={shape.backgroundColor || 'rgba(15, 23, 42, 0.9)'}
                    cornerRadius={6}
                    stroke={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={1.5}
                  />
                  <Text
                    text={shape.text}
                    fontSize={shape.fontSize || 14}
                    fill={shape.color || '#ffffff'}
                    padding={8}
                  />
                </Group>
              );
            }

            if (shape.type === 'highlighter') {
              return (
                <Line
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.color || '#facc15'}
                  strokeWidth={shape.strokeWidth || 14}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.45}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onDragEnd={(e) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    e.target.x(0);
                    e.target.y(0);
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id && a.type === 'highlighter'
                        ? {
                            ...a,
                            points: a.points.map((val, idx) => (idx % 2 === 0 ? val + dx : val + dy)),
                          }
                        : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                />
              );
            }

            if (shape.type === 'blur') {
              return (
                <PixelatedBlurShape
                  key={shape.id}
                  shape={shape}
                  sourceImage={image}
                  isSelected={isSelected}
                  activeTool={activeTool}
                  onSelect={() => onSelectShape(shape.id)}
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                />
              );
            }

            if (shape.type === 'redact') {
              return (
                <Rect
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill="#000000"
                  cornerRadius={2}
                  draggable={activeTool === 'select'}
                  onClick={() => onSelectShape(shape.id)}
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={(e) => {
                    const updated = step.annotations.map((a) =>
                      a.id === shape.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    );
                    onUpdateStep({ ...step, annotations: updated });
                  }}
                />
              );
            }

            return null;
          })}

          {/* Current In-Progress Shape Drawing */}
          {isDrawing && currentShape && (
            <>
              {currentShape.type === 'arrow' && (
                <Arrow
                  points={currentShape.points}
                  stroke={currentShape.color}
                  fill={currentShape.color}
                  strokeWidth={currentShape.strokeWidth}
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
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.4}
                />
              )}
              {currentShape.type === 'blur' && (
                <Rect
                  x={currentShape.x}
                  y={currentShape.y}
                  width={currentShape.width}
                  height={currentShape.height}
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
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

          {/* Transformer for Selection, Resize, and Rotate */}
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                return oldBox;
              }
              return newBox;
            }}
            anchorFill="#38bdf8"
            anchorStroke="#ffffff"
            anchorSize={9}
            borderStroke="#38bdf8"
            borderDash={[3, 3]}
          />
        </Layer>
      </Stage>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-white text-xs shadow-xl">
        <button
          onClick={() => handleZoom(-0.1)}
          className="px-2 py-0.5 hover:bg-slate-800 rounded font-bold"
          title="Zoom Out"
        >
          -
        </button>
        <span className="w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => handleZoom(0.1)}
          className="px-2 py-0.5 hover:bg-slate-800 rounded font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={resetZoom}
          className="ml-1 text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
        >
          Fit
        </button>
      </div>
    </div>
  );
};
