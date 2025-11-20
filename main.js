//Define data
let data = [
    { name: 'Rainne'    , rating: 8 },
    { name: 'Buddy'    , rating: 7 },
    { name: 'Paddy'   , rating: 3 },
    { name: 'Sticky', rating: 9 },
    { name: 'Midnight'  , rating: 5 },
    { name: 'Leo'  , rating: 6 }
  ];

let 
  width = 600,
  height = 400;

let margin = {
  top:50,
  bottom:50,
  left:50,
  right:50
}

let svg = d3.select('body')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'lightyellow')

//Define the scales:
let yScale = d3.scaleLinear()
              .domain([0,10])
              .range([height - margin.bottom, margin.top])

let xScale = d3.scaleBand()
              .domain(data.map(d => d.name))
              .range([margin.left, width - margin.right])

//make axis with the scale functions
let xAxis = svg.append('g')
              .call(d3.axisBottom().scale(xScale))
              .attr('transform', `translate(0, ${height - margin.bottom})`)

let yAxis = svg.append('g')
              .call(d3.axisLeft().scale(yScale))
              .attr('transform', `translate(${margin.left}, 0)`)

//Draw the labels
svg.append('text')
  .attr('x', width/2)
  .attr('y', height - 15)
  .text('Name')
  .style('text-anchor', 'middle')

svg.append('text')
    .attr('x', 0 - height/2)
    .attr('y', 25)
    .text('Rating')
    .style('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')

//draw the line
let line = d3.line()
            .x(d => xScale(d.name) + xScale.bandwidth()/2)
            .y(d => yScale(d.rating))
            .curve(d3.curveNatural)

let path = svg.append('path')
              .datum(data)
              .attr('d', line)
              .attr('stroke', 'black')
              .attr('fill', 'none')