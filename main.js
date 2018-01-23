var screen_size = {"width": 1600, "height": 900}

var canvas = document.getElementById("screen")
var screen = canvas.getContext("2d")
var fps = 60
var tilesize = 20
var tiles = []
var buildings = []
var mouse_x = 0
var mouse_y = 0
var lab_img = new Image()
lab_img.src = "lab.png"

canvas.width = screen_size["width"]
canvas.height = screen_size["height"]
tilecolors = {
	"empty": "#222",
	"water": "#0000FF",
	"grass": "#0f0"
}
for (var y = 0; y < screen_size["height"]; y += tilesize){
	for (var x = 0; x < screen_size["width"]; x += tilesize){
		tiles.push({"x": x, "y": y, "color": "#0000FF"})
		//tiles.push({"x": x, "y": y, "color": '#'+(Math.random()*0xFFFFFF<<0).toString(16)})
	}
}

class Option {
	constructor(on_click, hot_key, sprite, fall_back_color){
		this.on_click = on_click
		this.hot_key = hot_key
		this.sprite = sprite
		this.fall_back_color = fall_back_color
	}
}

class Menu {
	constructor(options){
		this.options = options
	}

	render(){
		screen.fillStyle = "#333"
		screen.fillRect(screen_size["width"] - 11 * tilesize, 0, 11 * tilesize, screen_size["height"])
		screen.fillStyle = "#aaa"
		screen.fillRect(screen_size["width"] - 10 * tilesize, tilesize, 9 * tilesize, 6 * tilesize)
		for(var x = 0; x < 2; x++){
			for (var y = 0; y < 7; y++) {
				var x_pos = screen_size["width"] - 10 * tilesize + x * (5 * tilesize)
				var y_pos = 10 * tilesize + y * (5 * tilesize)
				screen.fillStyle = "#aaa"
				screen.fillRect(x_pos, y_pos, 4 * tilesize, 4 * tilesize)
			}
		}
	}

	update(){

	}
}

class PhantomBuilding{
	constructor(width, height, sprite, fall_back_color){
		this.width = width
		this.height = height
		this.sprite = sprite
		this.fall_back_color = fall_back_color
	}

	get_tile_children(){
		var children = []
		var tl_tile = get_tile(mouse_x, mouse_y)
		var x = tl_tile["x"]
		var y = tl_tile["y"]
		for (var dy = y; dy < this.height + y; dy += tilesize){
			for (var dx = x; dx < this.width + x; dx += tilesize){
				var tile_master = get_tile(dx, dy)
				children.push({"x": tile_master["x"], "y": tile_master["y"], "color": tile_master["color"]})
			}	
		}
		return children
	}

	render(){
		var tl_tile = get_tile(mouse_x, mouse_y)
		var x = tl_tile["x"]
		var y = tl_tile["y"]
		var bg_tiles = get_phantom_valid_tiles(this)
		for (i in bg_tiles) render_tile(bg_tiles[i])
		screen.globalAlpha = 0.4
		if(this.sprite == undefined){
			screen.fillStyle = this.fall_back_color
			screen.fillRect(mouse_x, mouse_y, this.width, this.height)
		}else{
			screen.drawImage(this.sprite["src"], tl_tile["x"] + this.sprite["x_off"], tl_tile["y"] + this.sprite["y_off"], this.sprite["width"], this.sprite["height"])
		}
		screen.globalAlpha = 1.0
	}
}

class Building {
	constructor(x, y, width, height, sprite, fall_back_color, health, max_health){
		this.x = x
		this.y = y
		this.width = width
		this.height = height
		this.sprite = sprite
		this.fall_back_color = fall_back_color
		this.health = health
		this.max_health = max_health
		this.destroyed = false
		this.removed = false
		if(this.health > this.max_health) this.health = this.max_health
	}

	render_health(){
		var width = this.width * (this.health / this.max_health)
		screen.fillStyle = "#FF0000"
		screen.fillRect(this.x, this.y - 20, this.width, 10)
		if(!this.destroyed){
			screen.fillStyle = "#00FF00"
			screen.fillRect(this.x, this.y - 20, width, 10)
		}
	}

	get_tile_children(){
		var children = []
		var tl_tile = get_tile(mouse_x, mouse_y)
		for (var dy = this.y; dy < this.height + this.y; dy += tilesize){
			for (var dx = this.x; dx < this.width + this.x; dx += tilesize){
				children.push(get_tile(dx, dy))
			}	
		}
		return children
	}

	render(){
		if(this.removed) return
		var bg_tiles = this.get_tile_children()
		for (var i in bg_tiles) render_tile(bg_tiles[i])
		if(this.sprite == undefined){
			if(mouse_x < this.x + this.width && mouse_x >= this.x && mouse_y < this.y + this.height && mouse_y >= this.height)
				screen.fillStyle = luminate_hex(this.fall_back_color, -0.2)
			else screen.fillStyle = this.fall_back_color
			screen.fillRect(this.x, this.y, this.width, this.height)
		}else{
			if(mouse_x < this.x + this.width && mouse_x >= this.x && mouse_y < this.y + this.height && mouse_y >= this.height)
				screen.filter = "brightness(1.3)"
			screen.drawImage(this.sprite["src"], this.x + this.sprite["x_off"], this.y + this.sprite["y_off"], this.sprite["width"], this.sprite["height"])
			screen.filter = "none"
		}
		if(this.health != this.max_health) this.render_health()
	}

	update(){
		if(this.removed) return
		
		if(this.health <= 0) {
			this.health = 0
			this.destroyed = true
		}
	}
}

// Config after class definitions
var menu = new Menu([])
var current_phantom_building = new PhantomBuilding(4 * tilesize, 3 * tilesize, {"src": lab_img, "width": 80, "height": 80, "x_off": 0, "y_off": -tilesize}, "#FF0000")

function arrayHasObject(array, object){
	for (var i = 0; i < array.length; i++){
		var obj_matched = true
		for (var j in object){
			if(!array[i].hasOwnProperty(j)) continue
			if (array[i][j] != object[j]) obj_matched = false 
		}
		if(obj_matched) return i
	}
	return -1
}

function get_tiles(){
	return tiles.slice(0)
}

function get_tile(x, y){
	tiles_sliced = get_tiles()
	x = Math.floor(x / tilesize)
	y = Math.floor(y / tilesize)
	var width = Math.floor(screen_size["width"] / tilesize)
	return tiles_sliced[x + y * width]
}

function get_phantom_valid_tiles(phantom){
	var phantom_tiles = phantom.get_tile_children()
	for(i in phantom_tiles){
		var phantom_tile = phantom_tiles[i]
		for (j in buildings){
			phantom_tile["color"] = (arrayHasObject(buildings[j].get_tile_children(), phantom_tile) == -1) ? "#00FF00" : "#FF0000"
		}
		
	}
	return phantom_tiles
}

function luminate_hex(hex, lum) {
	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}
	lum = lum || 0;

	// convert to decimal and change luminosity
	var rgb = "#", c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ("00"+c).substr(c.length);
	}
	return rgb;
}

function get_buffer(w,h) {
  var c = document.getElementById("buffer");
  c.width = w;
  c.height = h;
  return c;
};

function render_tile(tile){
	if(current_phantom_building == undefined && mouse_x < tile["x"] + tilesize && mouse_x >= tile["x"] && mouse_y < tile["y"] + tilesize && mouse_y >= tile["y"]) 
		screen.fillStyle = luminate_hex(tile["color"], -0.1)
	else screen.fillStyle = tile["color"]
	screen.fillRect(tile["x"], tile["y"], tilesize, tilesize)
	screen.fillStyle = luminate_hex(tile["color"], -0.1)
	screen.fillRect(tile["x"], tile["y"], tilesize, 1)
	screen.fillRect(tile["x"], tile["y"], 1, tilesize)
}

function place_building(phantom, x, y){
	buildings.push(new Building(get_tile(x, y)["x"], get_tile(x, y)["y"], phantom["width"], phantom["height"], phantom["sprite"], phantom["fall_back_color"], 10, 10))
}

function update(){
	for(i in buildings) buildings[i].update()
	menu.update()
}

function render(){
	for (i in tiles) render_tile(tiles[i])
	for (i in buildings) buildings[i].render()
	if (current_phantom_building != null) current_phantom_building.render()
	menu.render()
}

function tick(){
	update()
	render()
}

canvas.addEventListener('click', function(evt){
	// Handle building
	if(current_phantom_building != null) place_building(current_phantom_building, mouse_x, mouse_y)
}, false);

// Run
setInterval(tick, 1000 / 60)

canvas.addEventListener('mousemove', function(evt) {
	var rect = canvas.getBoundingClientRect();
	mouse_x = evt.clientX - rect.left
	mouse_y = evt.clientY - rect.top
}, false);