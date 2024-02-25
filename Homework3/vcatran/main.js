// setting svg height and width to window dimensions
const svgWidth = window.innerWidth;
const svgHeight = window.innerHeight;

// setting up viz height/width and margins
const barMargin = { top: 50, right: 30, bottom: 50, left: 150 };
const barWidth = svgWidth - (svgWidth / 4) - barMargin.left - barMargin.right;
const barHeight = svgHeight / 2.5 - barMargin.top - barMargin.bottom;

const pcMargin = { top: 50, right: 30, bottom: 25, left: 30 };
const pcWidth = svgWidth- pcMargin.left - pcMargin.right;
const pcHeight = svgHeight / 2 - pcMargin.top - pcMargin.bottom;

const pieMargin = { top: 50, right: 30, bottom: 50, left: 150 };
const pieWidth = svgWidth / 4 - pieMargin.left - pieMargin.right;
const pieHeight = svgHeight / 2.5 - pieMargin.top - pieMargin.bottom;

// loading data from csv file
d3.csv("ds_salaries.csv").then(rawData => {
    // processing data
    rawData.forEach(d => {
        d.work_year = Number(d.work_year);
        d.experience_lvl = String(d.experience_level); 
        d.employment_type = String(d.employment_type);
        d.job_title = String(d.job_title);
        d.salary_in_usd = Number(d.salary_in_usd);
        d.company_location = String(d.company_location);
        d.remote_ratio = Number(d.remote_ratio);
    });

    rawData = rawData.filter(d => d.salary_in_usd > 0 && d.job_title);

    // BAR CHART
    // sorting data and calculating avg salary in usd
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

    // setting up x axis with job titiles
    const xScale = d3.scaleBand()
        .domain(jobData.map(d => d.job_title))
        .range([0, barWidth])
        .paddingInner(0.3)
        .paddingOuter(0.2);

    // setting up x axis with avg salary
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(jobData, d => d.avg_salary_in_usd)])
        .range([barHeight, 0]);

    const xAxis = d3.axisBottom(xScale);
    svg.append("text")
        .attr("x", barMargin.left + barWidth / 2)
        .attr("y", svgHeight - pcHeight - pcMargin.top - barMargin.bottom + 10)
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
        .attr("x", svgWidth / 3)
        .attr("y", barMargin.top)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Average Salaries by Job Title");

    // PARALLEL CORRDINATES PLOT
    const pcSvg = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${pcMargin.left + 100},${barHeight + barMargin.bottom + pcMargin.top + 150})`);

    // creatng dimensions for parallel plot
    const dimensions = d3.keys(rawData[0]).filter(d =>
        d != "company_location" &&
        d != "salary" &&
        d != "salary_currency" &&
        d != "employee_residence" &&
        d != "company_size"
    );

    // updating y axis for numerical and categorical vars
    const y = {};
    dimensions.forEach(name => {
        if (name === 'salary_in_usd') {
            y[name] = d3.scaleLinear()
                .domain(d3.extent(rawData, d => d[name]))
                .range([pcHeight, 0]);
        }
        else if (name === 'job_title') {
            y[name] = d3.scalePoint()
            .domain([...new Set(rawData.map(d => d[name]))])
            .range([pcHeight, 0]);
        } else {
            y[name] = d3.scalePoint()
                .domain([...new Set(rawData.map(d => d[name]))])
                .range([pcHeight, 0]);
        }
    });


    const x = d3.scalePoint()
        .range([0, pcWidth])
        .padding(1.5)
        .domain(dimensions);

    const line = d3.line()
        .defined(d => !isNaN(y[d[0]](d[1])))
        .x(d => x(d[0]))
        .y(d => y[d[0]](d[1]));

    // drawing line
    pcSvg.selectAll(".line")
        .data(rawData)
        .enter().append("path")
        .attr("class", "line")
        .attr("d", d => line(dimensions.map(p => [p, d[p]])))
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("stroke-width", 2)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    pcSvg.selectAll(".axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => "translate(" + x(d) + ",0)")
        .each(function (d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black")
        .style("font-size", "12px");

    // labeling
    pcSvg.append("text")
        .attr("x", pcWidth / 2)
        .attr("y", pcHeight - 575)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Parallel Plot of Data Science Jobs");

    // PIE CHART
    const pieSvg = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${barWidth + barMargin.right + pieMargin.left + 50},${pieMargin.top})`);

    // sorting data for experience level
    const expCount = d3.nest()
        .key(d => d.experience_level)
        .rollup(values => values.length)
        .entries(rawData);

    // mapping to pie chart
    const pieData = expCount.map(d => ({
        category: d.key,
        value: d.value
    }));

    const pieRadius = Math.min(pieWidth, pieHeight) / 2;

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

    // creating select interaction for pie chart
    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => pieColors(d.data.category))
        .on("click", handlePieClick);

    const totalCount = d3.sum(pieData, d => d.value);

    // creating legend for pie chart
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
            // formatting legend so its readable
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

    pieSvg.append("text")
        .attr("x", pieWidth / 2)
        .attr("y", pieHeight)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Distribution of Experience Level");

    let selectedExperienceLevels = [];

    // add click event listener to bars for selection
    g2.selectAll(".bar")
        .on("click", function (d) {
            const selectedJob = d.job_title;
            const index = selectedJobs.indexOf(selectedJob);

            // if job is not selected, add it to the selectedJobs array
            // if job is already selected, remove it from the array
            if (index === -1) {
                selectedJobs.push(selectedJob);
                d3.select(this).attr("fill", "orange");
            } else {
                selectedJobs.splice(index, 1);
                d3.select(this).attr("fill", "steelblue");
            }

            // call update function with selected jobs
            updateChart(selectedJobs);
        });

    // function to handle chart changes based on selected experience levels
    function updateChart(selectedExperienceLevels) {
        // filter raw data based on selected experience levels
        const filteredData = rawData.filter(d => selectedExperienceLevels.includes(d.experience_level));

        // recalculate jobData based on the filtered data
        const jobSalaries = d3.nest()
            .key(d => d.job_title)
            .rollup(values => d3.mean(values, d => d.salary_in_usd))
            .entries(filteredData);

        const jobData = jobSalaries.map(d => ({
            job_title: d.key,
            avg_salary_in_usd: d.value,
            experience_level: filteredData.find(item => item.job_title === d.key).experience_level // getting the experience level for the job title
        }));

        // udate  bars based on the filtered jobData
        g2.selectAll(".bar")
            .data(jobData, d => d.job_title)
            .transition()
            .duration(500)
            .attr("y", d => yScale(d.avg_salary_in_usd))
            .attr("height", d => barHeight - yScale(d.avg_salary_in_usd))
            .attr("fill", d => pieColors(d.experience_level))
            .attr("fill-opacity", 1); 
    }

    // add click event listener to pie chart arcs for selection
    function handlePieClick(d) {
        const selectedExperienceLevel = d.data.category;
        const index = selectedExperienceLevels.indexOf(selectedExperienceLevel);
    
        // reset for when new part of chart is clicked
        if (index === -1) {
            selectedExperienceLevels = [selectedExperienceLevel];
            arcs.attr("fill", d => selectedExperienceLevels.includes(d.data.category) ? pieColors(d.data.category) : "steelblue");
        } else {
            selectedExperienceLevels.splice(index, 1);
            arcs.attr("fill", d => selectedExperienceLevels.includes(d.data.category) ? pieColors(d.data.category) : "steelblue");
        }
    
        // updating
        updateChart(selectedExperienceLevels);
    }
    
    // fucntion for mouse over
    function handleMouseOver(d) {
        pcSvg.selectAll(".line")
            .transition()
            .duration(200)
            .style("stroke-opacity", 0);
        d3.select(this)
            .transition()
            .duration(200)
            .style("stroke-opacity", 1)
            .style("stroke-width", 3);
        
        // getting var based on whats being moused over
        const jobTitle = d.job_title;
        const salary = d.salary_in_usd;
        const workYear = d.work_year;
        const explvl = d.experience_level;
        const empType = d.employment_type;
        const remoteR = d.remote_ratio;
    
        // update the text to show the moused-over job title and salary
        pcSvg.selectAll(".job-info-text")
            .remove();
    
        pcSvg.selectAll(".axis text")
            .filter(text => text !== jobTitle)
            .filter(text => text !== explvl)
            .filter(text => text !== workYear)
            .filter(text => text !== empType)
            .filter(text => text !== remoteR)
            .style("visibility", "hidden")
    
        // displaying salary
        pcSvg.append("text")
            .attr("class", "job-info-text")
            .attr("x", pcWidth / 2)
            .attr("y", pcHeight + 30)
            .style("text-anchor", "middle")
            .style("font-size", "25px")
            .text(` Salary: $${salary}`);
    }
    
    // fucntion for when mosue isnt over parallel plot
    function handleMouseOut(d) {
        pcSvg.selectAll(".line")
            .transition()
            .duration(200)
            .style("stroke-opacity", 1)
            .style("stroke-width", 2);
    
        pcSvg.selectAll(".axis text")
            .style("visibility", "visible")
            .style("font-size", "12px");
    }
    

    // var for parallel coordinates plot lines and axes
    const pcLinesGroup = pcSvg.append("g");

    // Append lines to the group
    pcLinesGroup.selectAll(".line")
        .data(rawData)
        .enter().append("path")
        .attr("class", "line")
        .attr("d", d => line(dimensions.map(p => [p, d[p]])))
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("stroke-width", 2)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    // add axes to the group
    pcLinesGroup.selectAll(".axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => "translate(" + x(d) + ",0)")
        .each(function (d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black")
        .style("font-size", "12px");

}).catch(error => {
    console.log(error);
});
