const svgWidth = window.innerWidth;
const svgHeight = window.innerHeight;

const barMargin = { top: 50, right: 30, bottom: 50, left: 150 }; 
const barWidth = 1500 - barMargin.left - barMargin.right;
const barHeight = 500 - barMargin.top - barMargin.bottom;

const pcMargin = { top: 20, right: 30, bottom: 50, left: 150 };
const pcWidth = 1250 - pcMargin.left - pcMargin.right;
const pcHeight = 450 - pcMargin.top - pcMargin.bottom;

d3.csv("ds_salaries.csv").then(rawData => {
    rawData.forEach(d => {
        d.salary_in_usd = Number(d.salary_in_usd);
    });

    rawData = rawData.filter(d => d.salary_in_usd > 0 && d.job_title);

    const jobSalaries = d3.nest()
        .key(d => d.job_title)
        .rollup(values => d3.mean(values, d => d.salary_in_usd))
        .entries(rawData);

    const jobData = jobSalaries.map(d => ({
        job_title: d.key,
        avg_salary_in_usd: d.value
    }));

    const svg = d3.select("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const g2 = svg.append("g")
        .attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);

    const xScale = d3.scaleBand()
        .domain(jobData.map(d => d.job_title))
        .range([0, barWidth])
        .paddingInner(0.3)
        .paddingOuter(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(jobData, d => d.avg_salary_in_usd)])
        .range([barHeight, 0]);

    const xAxis = d3.axisBottom(xScale);
    svg.append("text")
        .attr("x", barMargin.left + barWidth / 2 - 25)
        .attr("y", svgHeight - barHeight - 190) 
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Job Title");

    g2.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)"); 

    const yAxis = d3.axisLeft(yScale);
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", barMargin.left / 3) 
        .attr("x", 0 - (svgHeight / 5))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Average Salary in USD");

    g2.append("g")
        .call(yAxis);

    g2.selectAll(".bar")
        .data(jobData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.job_title))
        .attr("y", d => yScale(d.avg_salary_in_usd))
        .attr("width", xScale.bandwidth())
        .attr("height", d => barHeight - yScale(d.avg_salary_in_usd))
        .attr("fill", "steelblue");

    svg.append("text")
        .attr("x", svgWidth / 3 + 150)
        .attr("y", barMargin.top ) 
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Average Salaries by Job Title");

    const pcSvg = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${pcMargin.left - 250},${barHeight + barMargin.top + pcMargin.top + 225})`);

    const dimensions = d3.keys(rawData[0]).filter(d => 
        d != "company_location" &&
        d != "salary" &&
        d != "experience_level" &&
        d != "employment_type" &&
        d != "job_title" &&
        d != "salary_currency" &&
        d != "employee_residence" &&
        d != "company_size"
    );
    
    const y = {};
    dimensions.forEach(name => {
        y[name] = d3.scaleLinear()
        .domain(d3.extent(rawData, d => +d[name]))
        .range([pcHeight + 50, 10]);
    });

    const x = d3.scalePoint()
        .range([0, pcWidth])
        .padding(1)
        .domain(dimensions);

    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => x(d[0]))
        .y(d => y[d[0]](d[1]));

    pcSvg.selectAll(".line")
        .data(rawData)
        .enter().append("path")
        .attr("class", "line")
        .attr("d", d => line(dimensions.map(p => [p, d[p]])))
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("stroke-width", 2);

    pcSvg.selectAll(".axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => "translate(" + x(d) + ",0)")
        .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black");

    pcSvg.append("text")
    .attr("x", svgWidth / 4 + 50)
    .attr("y", pcMargin.top - 75) 
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Parallel Plot of Data Science Jobs");

    const pieSvg = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${pcMargin.left + pcWidth - 150},${barHeight + barMargin.top + pcMargin.top + 250})`);

    const expCount = d3.nest()
        .key(d => d.experience_level)
        .rollup(values => values.length)
        .entries(rawData);
    
    const pieData = expCount.map(d => ({
        category: d.key,
        value: d.value
    }));

    const pieRadius = Math.min(pcWidth, pcHeight) / 2;

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);

    const pieLayout = d3.pie()
        .value(d => d.value);

    const pieColors = d3.scaleOrdinal(d3.schemeCategory10);

    const arcs = pieSvg.selectAll(".arc")
        .data(pieLayout(pieData))
        .enter()
        .append("g")
        .attr("class", "arc")
        .attr("transform", `translate(${pieRadius},${pieRadius})`);

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => pieColors(d.data.category));

    const totalCount = d3.sum(pieData, d => d.value);

    const pieLegend = pieSvg.selectAll(".legend")
        .data(pieData)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${-100},${i * 20})`);

    pieLegend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => pieColors(d.category));

    pieLegend.append("text")
        .attr("x", 20)
        .attr("y", 5)
        .text(d => {
            const percentage = (d.value / totalCount * 100).toFixed();

            const categoryNames = {
                "SE": "Senior",
                "MI": "Mid-Level",
                "EN": "Entry-Level",
                "EX": "Executive"
            };
            const categoryName = categoryNames[d.category] || d.category;

            return `${categoryName}: ${percentage}%`;
        });
    
    pcSvg.append("text")
    .attr("x", svgWidth / 1.5 + 100)
    .attr("y", pcMargin.top - 50) 
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Distribution of Experience Level");

}).catch(error => {
    console.log(error);
});
