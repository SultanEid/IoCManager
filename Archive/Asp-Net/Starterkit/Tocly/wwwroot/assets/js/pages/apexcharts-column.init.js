// Basic Column Chart
var options = {
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false,
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '45%',
      endingShape: 'rounded'
    },
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  series: [{
    name: 'Net Profit',
    data: [46, 57, 59, 54, 62, 58, 64, 60, 66]
  }, {
    name: 'Revenue',
    data: [74, 83, 102, 97, 86, 106, 93, 114, 94]
  }, {
    name: 'Free Cash Flow',
    data: [37, 42, 38, 26, 47, 50, 54, 55, 43]
  }],
  colors: ['#ed5e49','#086070','#2651e9'],
  xaxis: {
    categories: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  },
  yaxis: {
    title: {
      text: '$ (thousands)'
    }
  },
  grid: {
    borderColor: '#f1f1f1',
  },
  fill: {
    opacity: 1

  },
  tooltip: {
    y: {
      formatter: function (val) {
        return "$ " + val + " thousands"
      }
    }
  }
}

var chart = new ApexCharts(
  document.querySelector("#column_chart"),
  options
);

chart.render();


// Column with Datalabels
var options = {
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false,
    }
  },
  plotOptions: {
    bar: {
      dataLabels: {
        position: 'top', // top, center, bottom
      },
    }
  },
  dataLabels: {
    enabled: true,
    formatter: function (val) {
      return val + "%";
    },
    offsetY: -20,
    style: {
      fontSize: '12px',
      colors: ["#adb5bd"]
    }
  },
  series: [{
    name: 'Inflation',
    data: [2.5, 3.2, 5.0, 10.1, 4.2, 3.8, 3, 2.4, 4.0, 1.2, 3.5, 0.8]
  }],
  colors: ['#086070'],
  grid: {
    borderColor: '#f1f1f1',
  },
  xaxis: {
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    position: 'top',
    labels: {
      offsetY: -18,

    },
    axisBorder: {
      show: false
    },
    axisTicks: {
      show: false
    },
    crosshairs: {
      fill: {
        type: 'gradient',
        gradient: {
          colorFrom: '#D8E3F0',
          colorTo: '#BED1E6',
          stops: [0, 100],
          opacityFrom: 0.4,
          opacityTo: 0.5,
        }
      }
    },
    tooltip: {
      enabled: true,
      offsetY: -35,

    }
  },
  fill: {
    gradient: {
      shade: 'light',
      type: "horizontal",
      shadeIntensity: 0.25,
      gradientToColors: undefined,
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [50, 0, 100, 100]
    },
  },
  yaxis: {
    axisBorder: {
      show: false
    },
    axisTicks: {
      show: false,
    },
    labels: {
      show: false,
      formatter: function (val) {
        return val + "%";
      }
    }
  },
  title: {
    text: 'Monthly Inflation in Argentina, 2002',
    floating: true,
    offsetY: 320,
    align: 'center',
    style: {
      color: '#444'
    },
    style: {
      fontWeight: 500,
    },
  },
}

var chart = new ApexCharts(
  document.querySelector("#column_chart_datalabel"),
  options
);

chart.render();

// Stacked Columns Charts

var options = {
  series: [{
    name: 'PRODUCT A',
    data: [44, 55, 41, 67, 22, 43]
  }, {
    name: 'PRODUCT B',
    data: [13, 23, 20, 8, 13, 27]
  }, {
    name: 'PRODUCT C',
    data: [11, 17, 15, 15, 21, 14]
  }, {
    name: 'PRODUCT D',
    data: [21, 7, 25, 13, 22, 8]
  }],
  chart: {
    type: 'bar',
    height: 350,
    stacked: true,
    toolbar: {
      show: false
    },
    zoom: {
      enabled: true
    },
    toolbar: {
      show: false,
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      legend: {
        position: 'bottom',
        offsetX: -10,
        offsetY: 0
      }
    }
  }],
  plotOptions: {
    bar: {
      horizontal: false,
      borderRadius: 10
    },
  },
  xaxis: {
    type: 'datetime',
    categories: ['01/01/2011 GMT', '01/02/2011 GMT', '01/03/2011 GMT', '01/04/2011 GMT',
      '01/05/2011 GMT', '01/06/2011 GMT'
    ],
  },
  legend: {
    position: 'right',
    offsetY: 40
  },
  fill: {
    opacity: 1
  },
  colors: ['#086070','#ed5e49','#2651e9','#fcb92c'],
};

var chart = new ApexCharts(document.querySelector("#column_stacked"), options);
chart.render();

// 100% Stacked Column Chart
var options = {
  series: [{
    name: 'PRODUCT A',
    data: [44, 55, 41, 67, 22, 43, 21, 49]
  }, {
    name: 'PRODUCT B',
    data: [13, 23, 20, 8, 13, 27, 33, 12]
  }, {
    name: 'PRODUCT C',
    data: [11, 17, 15, 15, 21, 14, 15, 13]
  }],
  chart: {
    type: 'bar',
    height: 350,
    stacked: true,
    stackType: '100%',
    toolbar: {
      show: false,
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      legend: {
        position: 'bottom',
        offsetX: -10,
        offsetY: 0
      }
    }
  }],
  xaxis: {
    categories: ['2011 Q1', '2011 Q2', '2011 Q3', '2011 Q4', '2012 Q1', '2012 Q2',
      '2012 Q3', '2012 Q4'
    ],
  },
  fill: {
    opacity: 1
  },
  legend: {
    position: 'right',
    offsetX: 0,
    offsetY: 50
  },
  colors: ['#086070','#2651e9','#fcb92c'],
};

var chart = new ApexCharts(document.querySelector("#column_stacked_chart"), options);
chart.render();

// column with Markers
var options = {
  series: [
    {
      name: 'Actual',
      data: [
        {
          x: '2011',
          y: 1292,
          goals: [
            {
              name: 'Expected',
              value: 1400,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2012',
          y: 4432,
          goals: [
            {
              name: 'Expected',
              value: 5400,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2013',
          y: 5423,
          goals: [
            {
              name: 'Expected',
              value: 5200,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2014',
          y: 6653,
          goals: [
            {
              name: 'Expected',
              value: 6500,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2015',
          y: 8133,
          goals: [
            {
              name: 'Expected',
              value: 6600,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2016',
          y: 7132,
          goals: [
            {
              name: 'Expected',
              value: 7500,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2017',
          y: 7332,
          goals: [
            {
              name: 'Expected',
              value: 8700,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        },
        {
          x: '2018',
          y: 6553,
          goals: [
            {
              name: 'Expected',
              value: 7300,
              strokeWidth: 5,
              strokeColor: '#775DD0'
            }
          ]
        }
      ]
    }
  ],
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false,
    }
  },
  plotOptions: {
    bar: {
      columnWidth: '30%'
    }
  },
  colors: ['#fcb92c','#086070'],
  dataLabels: {
    enabled: false
  },
  legend: {
    show: true,
    showForSingleSeries: true,
    customLegendItems: ['Actual', 'Expected'],
    markers: {
      fillColors: ['#51d28c', '#564ab1']
    }
  }
};

var chart = new ApexCharts(document.querySelector("#column_markers"), options);
chart.render();

//  Column with Rotated Labels
var options = {
  series: [{
    name: 'Servings',
    data: [44, 55, 41, 67, 22, 43, 21, 33, 45, 31, 87, 65, 35]
  }],
  annotations: {
    points: [{
      x: 'Bananas',
      seriesIndex: 0,
      label: {
        borderColor: '#775DD0',
        offsetY: 0,
        style: {
          color: '#fff',
          background: '#775DD0',
        },
        text: 'Bananas are good',
      }
    }]
  },
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false,
    }
  },
  plotOptions: {
    bar: {
      borderRadius: 10,
      columnWidth: '50%',
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    width: 2
  },
  xaxis: {
    labels: {
      rotate: -45
    },
    categories: ['Apples', 'Oranges', 'Strawberries', 'Pineapples', 'Mangoes', 'Bananas',
      'Blackberries', 'Pears', 'Watermelons', 'Cherries', 'Pomegranates', 'Tangerines', 'Papayas'
    ],
    tickPlacement: 'on'
  },
  yaxis: {
    title: {
      text: 'Servings',
    },
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: "horizontal",
      shadeIntensity: 0.25,
      gradientToColors: undefined,
      inverseColors: true,
      opacityFrom: 0.85,
      opacityTo: 0.85,
      stops: [50, 0, 100]
    },
  }
};

var chart = new ApexCharts(document.querySelector("#column_rotated_labels"), options);
chart.render();



// Distributed Columns Charts

Apex = {
  chart: {
    toolbar: {
      show: false
    }
  },
  tooltip: {
    shared: false
  },
  legend: {
    show: false
  }
}

var colors = ['#038edc', '#51d28c', '#f7cc53', '#f34e4e', '#564ab1', '#5fd0f3'];

var options = {
  series: [{
    data: [21, 22, 10, 28, 16, 21, 13, 30]
  }],
  chart: {
    height: 350,
    type: 'bar',
    events: {
      click: function (chart, w, e) {
        // console.log(chart, w, e)
      }
    }
  },
  colors: colors,
  plotOptions: {
    bar: {
      columnWidth: '45%',
      distributed: true,
    }
  },
  dataLabels: {
    enabled: false
  },
  legend: {
    show: false
  },
  xaxis: {
    categories: [
      ['John', 'Doe'],
      ['Joe', 'Smith'],
      ['Jake', 'Williams'],
      'Amber',
      ['Peter', 'Brown'],
      ['Mary', 'Evans'],
      ['David', 'Wilson'],
      ['Lily', 'Roberts'],
    ],
    labels: {
      style: {
        colors: [
          '#038edc',
          '#51d28c',
          '#f7cc53',
          '#f34e4e',
          '#564ab1',
          '#5fd0f3',
        ],
        fontSize: '12px'
      }
    }
  }
};

var chart = new ApexCharts(document.querySelector("#column_distributed"), options);
chart.render();

// Range Column Chart
var options = {
  series: [{
    data: [{
      x: 'Team A',
      y: [1, 5]
    }, {
      x: 'Team B',
      y: [4, 6]
    }, {
      x: 'Team C',
      y: [5, 8]
    }, {
      x: 'Team D',
      y: [3, 11]
    }]
  }, {
    data: [{
      x: 'Team A',
      y: [2, 6]
    }, {
      x: 'Team B',
      y: [1, 3]
    }, {
      x: 'Team C',
      y: [7, 8]
    }, {
      x: 'Team D',
      y: [5, 9]
    }]
  }],
  chart: {
    type: 'rangeBar',
    height: 335,
    toolbar: {
      show: false,
    }
  },
  plotOptions: {
    bar: {
      horizontal: false
    }
  },
  dataLabels: {
    enabled: true
  },
  legend: {
    show: false,
  },
  colors: ['#086070','#2651e9'],
};

var chart = new ApexCharts(document.querySelector("#column_range"), options);
chart.render();