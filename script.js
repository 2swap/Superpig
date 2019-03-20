var ctx;
var canvas;
var w = 5.5, h = 11; // original CMG version is 5.5,11
var tileW = 64, tileH = 48;
var mx = 0, my = 0, minmx = 0, minmy = 0;
var prob = .6;
var animSpeed = 5;
var margin = 32;
var canvasW = w * tileW + 2*margin, canvasH = h * tileH + (tileW-tileH) + 2*margin;
var pigY, pigX; // real coords
var pigYA, pigXA; // animated coords
var pigThinking = false;
var plm = -2; // pig's last move
var grid = {};

var images = {};

window.onload = function() {
	resetTiles();
	canvas = document.getElementById("myCanvas");
	canvas.addEventListener("mousedown", onClick, false);
	canvas.addEventListener("mousemove", onMouseMove, false);
	canvas.addEventListener("keydown", resetTiles, false);
	
    ctx = canvas.getContext("2d");
    ctx.canvas.width = canvasW;
    ctx.canvas.height = canvasH;
	setInterval(renderGrid,25);
};

function resetTiles(){
	for (var y = 0; y < h; y++) for (var x = (y%2)/2; x+1 <= w; x++)
		setGrid(grid,y,x,Math.random()<prob);

	pigY = (h-1)/2;
	pigX = Math.ceil(w)/2-.5;
	setGrid(grid,pigY,pigX,false);
	pigYA = canvasH/2;
	pigXA = canvasW/2;
}

function renderGrid(){
	document.getElementById("mines").innerHTML = "<h1>"+(pigThinking?"Pig is thinking...":"Click to place a stone!")+"<h1>";
	document.getElementById("solved").innerHTML = "<h1>"+(isPigSurrounded()?"Solved!":"Good Luck!")+"</h1>";
	if(pigX>w-1||pigX<0||pigY>h-1||pigY<0) document.getElementById("solved").innerHTML = "<h1>You Lose!</h1>";

	ctx.fillStyle = "cyan";
	ctx.fillRect(0,0,canvasW,canvasH);

	ctx.save();
	ctx.translate(margin,margin);

	var min = 10000000;
	for (var s in grid) {
		var gx = strtox(s), gy = strtoy(s);
		var tx = gx*tileW; ty = gy*tileH;
		d = square(mx-(tx+tileW/2)) + square(my-(ty+tileH/2+(tileW-tileH)/2));
		if(d < min){
			min = d;
			minmx = gx;
			minmy = gy;
		}
		drawTile(tx, ty, grid[s]?"block":"hex");
	}

	//draw pig
	pigXA = (animSpeed*pigXA+pigX*tileW)/(animSpeed+1);
	pigYA = (animSpeed*pigYA+pigY*tileH)/(animSpeed+1);
	drawTile(pigXA,pigYA,"pig");

	//draw mouse
	if(!(minmx == pigX && minmy == pigY) && getGrid(grid,minmy,minmx) == false) drawTile(tileW*minmx,tileH*minmy,"mouse");

	ctx.restore();
}

function drawTile(x, y, id) {
	id = "images/"+id+".png";
	if(typeof images[id] === "undefined"){
		var drawing = new Image();
		drawing.src = id;
		images[id] = drawing;
		drawing.onload = function() { ctx.drawImage(drawing, x, y); }
	}else ctx.drawImage(images[id], x, y);
}

function getGrid(g,y,x){ return g[y+" "+x]; } // be sure to use == true (b/c undefined)
function setGrid(g,y,x,v){ g[y+" "+x] = v; }

function onMouseMove(event) {
    var rect = canvas.getBoundingClientRect();
    mx = event.clientX - rect.left - margin;
    my = event.clientY - rect.top - margin;
}
function onClick(event) {
	if(pigThinking) return;
	if(minmx == pigX && minmy == pigY) return;
	if(getGrid(grid,minmy,minmx) == true) return;
	setGrid(grid,minmy,minmx,true);
	pigMove();
	pigThinking = false;
}

function isPigSurrounded() {
	return plm == -1;
}

function square(x){
	return x*x;
}












//Recursive solver
function pigMove(){
	pigThinking = true;
	plm = -2;

	//check if only one move
	var moves = 0;
	var last = -1;
	for(var dir = 0; dir < 6; dir++){
		if(getGrid(grid,pigY+dirY(dir),pigX+dirX(dir)) == true)continue;
		moves++;
		last = dir;
	}
	if(moves<2){
		plm = last;
		if(plm != -1){
			pigY += dirY(plm);
			pigX += dirX(plm);
		}
		return;
	}

	//initial pruning flood
	if(plm == -2){
		var child = {};
		Object.keys(grid).forEach(function(key) { child[ key ] = grid[ key ]; });
		child[pigY+" "+pigX]=5;
		var edits = 1;
		while(edits>0){
			edits = 0;
			for(var s in child) if(child[s] == false) for(var dir = 0; dir < 6; dir++){
				var nY = strtoy(s)+dirY(dir), nX = strtox(s)+dirX(dir);
				if(getGrid(child,nY,nX) == 5){child[s]=5;edits++;break;}
			}
		}
		for(var s in child){
			if(child[s] == 5) child[s] = false;
			else child[s] = true;
		}
	}

	if(plm == -2) plm = pigMoveR(child,pigY,pigX);

	if(plm < 0) plm = last;
	pigY += dirY(plm);
	pigX += dirX(plm);
}
function pigMoveR(parent,pY,pX){
	for(var dir = 0; dir < 6; dir++){
		var nY = pY+dirY(dir), nX = pX+dirX(dir);
		if(getGrid(parent,nY,nX) == true)continue;
		var child = {};
		Object.keys(parent).forEach(function(key) { child[ key ] = parent[ key ]; });
		setGrid(child,pY,pX,true);
		if(humanMoveR(child,nY,nX)==1)return dir;
	}
	return -1;
}
function humanMoveR(parent,pY,pX){
	if(pX>w-1||pX<0||pY>h-1||pY<0) return -1;
	for(var s in parent){
		if(parent[s])continue;
		var child = {};
		Object.keys(parent).forEach(function(key) { child[ key ] = parent[ key ]; });
		child[s] = true;
		if(pigMoveR(child,pY,pX)==-1)return 1;
	}
	return -1;
}

function dirX(dir){ return (((Math.floor(dir/2)%3-1)==0)+1)*(dir%2-.5); }
function dirY(dir){ return Math.floor(dir/2)%3-1; }

function strtoy(s){
	return parseInt(s.split(" ")[0]);
}
function strtox(s){
	return parseFloat(s.split(" ")[1]);
}