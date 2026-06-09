import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import Draggable from 'react-draggable';
import {SWATCHES} from '@/constants';
import { Eraser, Pencil, RotateCcw, Play, Palette, CornerUpLeft, CornerUpRight, Download, Share2 } from 'lucide-react';
import logo from '/logo.svg';
import { sanitizeLatex, isSafeObjectKey, validateCalculateResponse, validateFileUpload, sanitizeFilename } from '@/lib/sanitize';

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

const MAX_CANVAS_DATA_URL_SIZE = 10 * 1024 * 1024;

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [isEraser, setIsEraser] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [showWidth, setShowWidth] = useState(false);
    const [lineWidth, setLineWidth] = useState(3);
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const lastMidRef = useRef<{ x: number; y: number } | null>(null);
    const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
    const [previewWidth, setPreviewWidth] = useState<number>(lineWidth);
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const undoStackRef = useRef<ImageData[]>([]);
    const redoStackRef = useRef<ImageData[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateStackStates = useCallback(() => {
        setCanUndo(undoStackRef.current.length > 0);
        setCanRedo(redoStackRef.current.length > 0);
    }, []);
    const colorRef = useRef<HTMLDivElement | null>(null);
    const widthRef = useRef<HTMLDivElement | null>(null);
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const logoRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    const renderLatexToCanvas = useCallback((expression: string, answer: string) => {
        const cleanExpr = sanitizeLatex(expression);
        const cleanAnswer = sanitizeLatex(answer);
        const latex = `\(\LARGE{${cleanExpr} = ${cleanAnswer}}\)`;
        setLatexExpression((prev) => [...prev, latex]);
    }, []);

    useEffect(() => {
        resetCanvas();
    }, [latexExpression]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setError(null);
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
            if (window.MathJax && window.MathJax.Hub) {
                window.MathJax.Hub.Config({
                    tex2jax: {inlineMath: [['$', '$'], ['\(', '\)']]},
                    'HTML-CSS': { availableFonts: [] },
                    messageStyle: 'none'
                });
            }
        };
        return () => {
            if (script.parentNode) document.head.removeChild(script);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.lineWidth = lineWidth;
        }
    }, [lineWidth]);

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const toggleEraser = () => {
        setIsEraser(!isEraser);
        setShowColors(false);
        if (!isEraser) { setLineWidth(20); setColor('rgb(0, 0, 0)'); }
        else { setLineWidth(3); setColor('rgb(255, 255, 255)'); }
    };

    const toggleColorPalette = () => {
        setShowColors(!showColors);
        if (isEraser) { setIsEraser(false); setLineWidth(3); setColor('rgb(255, 255, 255)'); }
    };

    const toggleWidthPalette = () => { setShowWidth(!showWidth); };

    useEffect(() => {
        const onDocDown = (ev: MouseEvent) => {
            const target = ev.target as Node | null;
            if (showColors && colorRef.current && target && !colorRef.current.contains(target)) setShowColors(false);
            if (showWidth && widthRef.current && target && !widthRef.current.contains(target)) setShowWidth(false);
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, [showColors, showWidth]);

    const activePointerId = useRef<number | null>(null);

    const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const getStrokeWidthFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const pressure = typeof e.pressure === 'number' ? e.pressure : 0;
        const multiplier = pressure > 0 ? 0.5 + pressure * 1.5 : 1;
        return Math.max(1, lineWidth * multiplier);
    };

    const getMidPoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
        x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2,
    });

    const startDrawingPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === 'touch' && (!e.isPrimary || (e.width && e.width > 50))) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
        activePointerId.current = e.pointerId;
        const pos = getPointerPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = getStrokeWidthFromEvent(e);
        lastPosRef.current = pos;
        lastMidRef.current = pos;
        setIsDrawing(true);
        setShowPreview(true);
        setPreviewPos({ x: e.clientX, y: e.clientY });
        setPreviewWidth(getStrokeWidthFromEvent(e));
    };

    const drawPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx
