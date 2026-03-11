import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, ChartDataLabels);

function BarChart({ rawData, labels }) {
  const chartHeight = Math.max(rawData.length * 50, 150)
  const data = {
    labels: labels,
    datasets: [
      {
        data: rawData.map(v => Math.abs(v)),
        backgroundColor: rawData.map(v => (v <= 0 ? '#4ade80' : '#f87171')),
        barPercentage: 1,
        categoryPercentage: 0.8,
        borderRadius: 5,
        maxBarThickness: 30,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: false, beginAtZero: true },
      y: {
        display: true,
        grid: { display: false },
        border: { display: false }
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      datalabels: {
        color: '#3C3C3C',
        anchor: 'start',
        align: 'right',
        offset: 10,
        formatter: (value, context) => {
          const originalValue = rawData[context.dataIndex];
          const sign = originalValue >= 0 ? '+' : '-';
          return `${sign}$${Math.abs(originalValue).toLocaleString()}`;
        },
        font: { weight: 'bold', size: 14 }
      },
    },
  };

  return (
    <div style={{ height: `${chartHeight}px`, width: '100%'}}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarChart;