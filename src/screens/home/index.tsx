import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import {SWATCHES} from '@/constants';
import { Eraser, Pencil, RotateCcw, Play, Palette } from 'lucide-react';
import logo from '/logo.svg';
// import {LazyBrush} from 'lazy-brush';

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [isEraser, setIsEraser] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [lineWidth, setLineWidth] = useState(3);
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);

    // const lazyBrush = new LazyBrush({
    //     radius: 10,
    //     enabled: true,
    //     initialPoint: { x: 0, y: 0 },
    // });

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    const renderLatexToCanvas = useCallback((expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
        setLatexExpression((prev) => [...prev, latex]);

        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, []);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result, renderLatexToCanvas]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
            }

        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]},
            });
        };

        return () => {
            document.head.removeChild(script);
        };

    }, []);

    // Update canvas context line width when lineWidth changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = lineWidth;
            }
        }
    }, [lineWidth]);


    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const toggleEraser = () => {
        setIsEraser(!isEraser);
        setShowColors(false);
        if (!isEraser) {
            setLineWidth(20);
            setColor('rgb(0, 0, 0)');
        } else {
            setLineWidth(3);
            setColor('rgb(255, 255, 255)');
        }
    };

    const toggleColorPalette = () => {
        setShowColors(!showColors);
        if (isEraser) {
            setIsEraser(false);
            setLineWidth(3);
            setColor('rgb(255, 255, 255)');
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                setIsDrawing(true);
            }
        }
    };
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };
    // Touch event handlers for mobile
    const getTouchPos = (touch: { clientX: number; clientY: number }) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas && e.touches && e.touches.length > 0) {
            const touchPos = getTouchPos(e.touches[0]);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(touchPos.x, touchPos.y);
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                setIsDrawing(true);
            }
        }
    };

    const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (canvas && e.touches && e.touches.length > 0) {
            const touchPos = getTouchPos(e.touches[0]);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.lineTo(touchPos.x, touchPos.y);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };  

    const runRoute = async () => {
        const canvas = canvasRef.current;
    
        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars
                }
            });

            const resp = await response.data;
            console.log('Response', resp);
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    // dict_of_vars[resp.result] = resp.answer;
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    });
                }
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {  // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPosition({ x: centerX, y: centerY });
            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };

    return (
        <>
            <div className="hidden md:block fixed top-0 left-16 z-30">
                <img src={logo} alt="Logo" className="h-24 w-36 md:h-24 md:w-36 hover:scale-110 transition-transform duration-200 shadow-lg" />
            </div>
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg backdrop-blur-sm">
                <Button
                    onClick={() => setReset(true)}
                    className="bg-transparent hover:bg-gray-100 text-white p-2 rounded-lg transition-all duration-200"
                    variant="ghost"
                    size="icon"
                >
                    <RotateCcw className="h-5 w-5" />
                </Button>
                
                <div className="relative">
                    <Button
                        onClick={toggleColorPalette}
                        className={`bg-transparent hover:bg-gray-800 text-white p-2 rounded-lg transition-all duration-200 ${showColors ? 'bg-gray-800' : ''}`}
                        variant="ghost"
                        size="icon"
                    >
                        <Palette className="h-5 w-5" style={{ color: color === 'rgb(0, 0, 0)' ? 'white' : color }} />
                    </Button>
                    {showColors && (
                        <div className="absolute top-full left-0 mt-2 p-2 bg-gray-900/50 backdrop-blur-sm rounded-lg flex gap-1">
                            {SWATCHES.map((swatch) => (
                                <ColorSwatch
                                    key={swatch}
                                    color={swatch}
                                    onClick={() => setColor(swatch)}
                                    className="cursor-pointer hover:scale-110 transition-transform"
                                />
                            ))}
                        </div>
                    )}
                </div>

                <Button
                    onClick={toggleEraser}
                    className={`bg-transparent hover:bg-gray-100 text-white p-2 rounded-lg transition-all duration-200 ${isEraser ? 'bg-gray-800' : ''}`}
                    variant="ghost"
                    size="icon"
                >
                    {isEraser ? <Pencil className="h-5 w-5" /> : <Eraser className="h-5 w-5" />}
                </Button>

                <Button
                    onClick={runRoute}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all duration-200"
                    size="icon"
                >
                    <Play className="h-5 w-5" />
                </Button>
            </div>

            <canvas
                ref={canvasRef}
                id='canvas'
                className='absolute top-0 left-0 w-full h-full bg-black'
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawingTouch}
                onTouchMove={drawTouch}
                onTouchEnd={stopDrawing}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}
        </>
    );
}