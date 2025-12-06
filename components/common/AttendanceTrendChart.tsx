import React, { useEffect, useRef, useId } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    TimeScale,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend
);

interface AttendanceTrendChartProps {
    data: { date: string; present: number; absent: number }[];
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ data }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const canvasId = useId();

    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        const canvas = chartRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Check if a chart already exists on this canvas and destroy it
        const existingChart = ChartJS.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        const chart = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.date),
                datasets: [
                    {
                        label: 'Present',
                        data: data.map(d => d.present),
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Absent',
                        data: data.map(d => d.absent),
                        backgroundColor: 'rgba(244, 63, 94, 0.6)',
                        borderColor: 'rgba(244, 63, 94, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM d, yyyy',
                        },
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    },
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            },
        });

        return () => {
            chart.destroy();
        };
    }, [data]);

    return <div className="h-96"><canvas id={canvasId} ref={chartRef}></canvas></div>;
};
