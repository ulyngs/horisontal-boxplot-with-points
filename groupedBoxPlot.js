//initialize the canvas dimensions
var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = 900 - margin.left - margin.right,
    height = 750 - margin.top - margin.bottom,
    padding = 30, labelWidth = 120,
    titleMargin = 40;

// Define the div for the tooltip
var div = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

//initialize the x scale
var xScale = d3.scale.linear()
    .range([labelWidth, width - padding]);

//initialize the x axis
var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .ticks(10);

// add potential background color to chart
svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "canvas");

// initialise color palette
var palette = d3.scale.category20();

//*******SET INPUT DATA FILE AND DRAWING SETTINGS HERE***********************'
d3.csv("fakeBasketData.csv", function(error,csv) {

    // set the domain of the xScale
    xScale.domain([0, 45]);

    // set the position of the y axis and append it
    var xAxisYPos = height - padding;
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + xAxisYPos + ")")
        .call(xAxis);

    // draw vertical grid lines
    svg.selectAll("line.verticalGrid")
        .data(xScale.ticks(10))
        .enter()
        .append("line")
        .attr("class", "verticalGrid")
        .attr("x1", function(d) { return xScale(d); })
        .attr("y1", xAxisYPos)
        .attr("x2", function(d) { return xScale(d); })
        .attr("y2", titleMargin + padding - 3);

    // add a title to the chart
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", titleMargin)
        .attr("class", "title") 
        .text("Goals Scored in Made-Up Basketball Season")
        .style("font-size", "20px");

    // set which category we want to group by and get them
    var groupingCategory = "playerList";
    var categories = d3.nest()
        .key(function(d) { return d[groupingCategory] })
        .entries(csv);

    // calculate how much canvas space we've got available to plot the data from each category
    var yCanvasSpaceForEach = (xAxisYPos - titleMargin) / (categories.length + 1)

    // iterate over each category and draw what you want on the plot
    for (var i = 0; i < categories.length; i++) {

        // filter the data by the current category
        var dataForCategory = csv.filter(function (d) {
            if (d[groupingCategory] == categories[i].key) { return d;}
        });

        // calculate where to plot on the canvas (draws from top to bottom)
        var boxY = yCanvasSpaceForEach * (i + 1) + titleMargin;

        // draw box-and-whiskers plot
        drawBoxes(svg, dataForCategory, colToPlot = "goals", whiskerHeight = 15, boxHeight = 30, boxY, boxNumber = i);

        // draw data points
        drawPoints(svg, dataForCategory, colToPlot = "goals", colToHover = "playerList", pointSize = 3.5, 
            outlierSize = 5, boxY, yDisplacement = 25, jitterAmount = 3, categoryIndex = i, hoverX = -5, hoverY = -10);

        // draw labels
        drawCategoryLabels(svg, label = categories[i].key, fontsize = 13, xPlacement = 5, boxY, yDisplacement = 4);
    }
});


//******************HELPER FUNCTIONS BELOW***********************
// function to calculate statistics summary
function calcBoxStats(data){
                
    // initialise stats object
    var dataStats = {
        outliers: [],
        minVal: Infinity,
        lowerWhisker: Infinity,
        q1Val: Infinity,
        medianVal: 0,
        q3Val: -Infinity,
        iqr: 0,
        upperWhisker: -Infinity,
        maxVal: -Infinity
    };

    // sort the data ascending
    data = data.sort(d3.ascending);

    //calculate statistics
    dataStats.minVal = data[0],
        dataStats.q1Val = d3.quantile(data, .25),
        dataStats.medianVal = d3.quantile(data, .5),
        dataStats.q3Val = d3.quantile(data, .75),
        dataStats.iqr = dataStats.q3Val - dataStats.q1Val,
        dataStats.maxVal = data[data.length - 1];

    var index = 0;

    //search for the lower whisker, the minimum value within q1Val - 1.5*iqr
    while (index < data.length && dataStats.lowerWhisker == Infinity) {

        if (data[index] >= (dataStats.q1Val - 1.5*dataStats.iqr))
            dataStats.lowerWhisker = data[index];
        else
            dataStats.outliers.push(data[index]);
        index++;
    }

    index = data.length-1; // reset index to end of array

    //search for the upper whisker, the maximum value within q1Val + 1.5*iqr
    while (index >= 0 && dataStats.upperWhisker == -Infinity) {
        if (data[index] <= (dataStats.q3Val + 1.5 * dataStats.iqr))
            dataStats.upperWhisker = data[index];
        else
            dataStats.outliers.push(data[index]);
        index--;
    }

    return dataStats;
}


/******function to draw box-and-whiskers plot*******
*   arguments: 
*       svg: the svg to plot on
*       csv: csv with the data to plot
*       colToPlot: name of the column (as a string) containing the data to plot
*       whiskerHeight: the length of whiskers you want
*       boxHeight: the height of the interquartile range box you want
*       boxY: the y-coordinate around which the boxes should be centered
*       categoryIndex: the index of the current category of data being plotted
*/
function drawBoxes(svg, csv, colToPlot, whiskerHeight, boxHeight, boxY, categoryIndex) {

    // make an array of the data to plot
    var data = csv.map(function(d) {
        return +d[colToPlot];       // coerce to a number
    });

    // get statistics for this data
    boxStats = calcBoxStats(data);

    //draw vertical line for lowerWhisker
    svg.append("line")
        .attr("class", "whisker")
        .attr("x1", xScale(boxStats.lowerWhisker))
        .attr("x2", xScale(boxStats.lowerWhisker))
        .attr("stroke", "black")
        .attr("y1", boxY - (whiskerHeight/2))
        .attr("y2", boxY + (whiskerHeight/2));

    //draw vertical line for upperWhisker
    svg.append("line")
        .attr("class", "whisker")
        .attr("x1", xScale(boxStats.upperWhisker))
        .attr("x2", xScale(boxStats.upperWhisker))
        .attr("stroke", "black")
        .attr("y1", boxY - (whiskerHeight/2))
        .attr("y2", boxY + (whiskerHeight/2));

    //draw horizontal line from lowerWhisker to 1st quartile
    svg.append("line")
        .attr("class", "whisker")
        .attr("x1", xScale(boxStats.lowerWhisker))
        .attr("x2", xScale(boxStats.q1Val))
        .attr("stroke", "black")
        .attr("y1", boxY)
        .attr("y2", boxY);

    //draw rect for iqr
    svg.append("rect")
        .attr("class", "box")
        .attr("stroke", "black")
        .attr("fill", palette(categoryIndex))       // sets new color for each box
        .attr("x", xScale(boxStats.q1Val))
        .attr("y", boxY - (boxHeight/2))
        .attr("width", xScale(boxStats.q3Val) - xScale(boxStats.q1Val))
        .attr("height", boxHeight);

//draw horizontal line from 3rd quartile to upperWhisker
    svg.append("line")
        .attr("class", "whisker")
        .attr("x1", xScale(boxStats.q3Val))
        .attr("x2", xScale(boxStats.upperWhisker))
        .attr("stroke", "black")
        .attr("y1", boxY)
        .attr("y2", boxY);
	
	
    //draw vertical line at median
    svg.append("line")
        .attr("class", "median")
        .attr("x1", xScale(boxStats.medianVal))
        .attr("x2", xScale(boxStats.medianVal))
        .attr("y1", boxY - (boxHeight/2))
        .attr("y2", boxY + (boxHeight/2));

}


/*  ***function to draw the data points***
*   arguments: 
*       svg: the svg to plot on
*       csv: csv with data to plot
*       colToPlot: name of the column (as a string) containing the data to plot
*       colToHover: the name of the column (as a string) from which data should be shown on hover
*       pointSize: the size of points you want
*       boxY: the y-coordinate around which the points should be centered
*       yDisplacement: any desired displacement up or down relative to the center
*       jitterAmount: the amount of jitter you want
*       categoryIndex: the index of the current category of data being plotted
*       hoverX: where, relative to the datapoint, should the hover text be shown horisontally?
*       hoverY: where, relative to the datapoint, should the hover text be shown vertically?
*/

function drawPoints(svg, csv, colToPlot, colToHover, pointSize, outlierSize, boxY, 
    yDisplacement, jitterAmount, categoryIndex, hoverX, hoverY) {
    
	boxY = boxY + yDisplacement;

	function random_jitter(boxY) {
	    if (Math.round(Math.random() * 1) == 0)
	        var seed = -jitterAmount;
	    else
	        var seed = jitterAmount;
	    return boxY + Math.floor((Math.random() * seed) + 1);
	}

    // make an array of the data we want to plot
    var data = csv.map(function(d) {
        return +d[colToPlot];
    });
                
    // get statistics
    boxStats = calcBoxStats(data);    

    // make a grouping for each data point
    var dataPoints = d3.select("svg")
        .selectAll(".dataPoints" + categoryIndex)   //select only data points drawn in the current iteration
        .data(csv)
        .enter()
        .append("g")
        .attr("class", "dataPoints" + categoryIndex)    
        .attr("transform", function(d){
            return "translate(" + xScale(d[colToPlot]) + "," + random_jitter(boxY) + ")";
        })
        
        // show app name when hovering over a data point
        .on("mouseover", function(d){       
            div.transition()
                .duration(200)
                .style("opacity", .9);
            
            div.html(d[colToHover] + ": " + d[colToPlot])
                .style("left", (d3.event.pageX) + "px")     
                .style("top", (d3.event.pageY - 28) + "px");
            console.log(d[colToHover].length);
        })
        // remove text when we move the mouse away
        .on("mouseout", function(d) {       
            div.transition()        
                .duration(500)      
                .style("opacity", 0);   
        });

        // draw the data points as circles
        dataPoints
            .append("circle")
            .attr("r", function(d) {
                if (d[colToPlot] < boxStats.lowerWhisker || d[colToPlot] > boxStats.upperWhisker)
                    return outlierSize;
                else
                    return pointSize;
            })
            .attr("class", function(d) {
                if (d[colToPlot] < boxStats.lowerWhisker || d[colToPlot] > boxStats.upperWhisker)
                    return "outlier";
                else
                    return "point";
            })
            .attr("fill", palette(categoryIndex)); 
}
        

/*  ***function to draw the category labels***
*   arguments: 
*       svg: the svg to plot on
*       category: string with the category label to plot
*       xDisplacement: where on the horisontal axis should the label be shown?
*       boxY: the y coordinate where the data for the category has been plotted
*       yDisplacement: any desired displacement up or down of the text
*/

function drawCategoryLabels(svg, label, fontsize, xPlacement, boxY, yDisplacement) { 
    d3.select("svg")
        .append("text")
        .attr("class", "categoryLabel")
        .text(label)
        .style("font-size", fontsize)
        .style("font-weight", 400)
        .attr("x", xPlacement)
        .attr("y", boxY + yDisplacement)    
}
