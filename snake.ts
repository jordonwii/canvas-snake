/// <reference path="jquery.d.ts"/>
/// <reference path="underscore.d.ts"/>

var DEFAULT_LENGTH:number = 5;
var DIRECTIONS:any = {
	"UP":38,
	"DOWN":40,
	"LEFT":37,
	"RIGHT":39
}
var OPPOSITES:any = {};
OPPOSITES[DIRECTIONS.UP] = DIRECTIONS.DOWN;
OPPOSITES[DIRECTIONS.DOWN] = DIRECTIONS.UP;
OPPOSITES[DIRECTIONS.LEFT] = DIRECTIONS.RIGHT;
OPPOSITES[DIRECTIONS.RIGHT] = DIRECTIONS.LEFT;

var VERTICALS:Array = [DIRECTIONS.UP, DIRECTIONS.DOWN];
var HORIZONTALS:Array = [DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
var PLAYING_WIDTH:number = window.innerWidth;
var PLAYING_HEIGHT:number = window.innerHeight-50;
var SNAKE_BLOCK_BASE:number = 10;
var SNAKE_BLOCK_SIDE:number = 12;
var DISABLED = false;
var MOVE_UNIT:number = 12;
var SNAKE_COLORS = ["blue", "red", "gray"]
interface Drawable {
	context:any;
	render:() => void;
}

interface CoordinatePair {
	x:number;
	y:number;
}

function makeRange(begin:number, end?:number) {
	if (end == undefined || end == null){
		end = begin;
		begin = 0;
	}
	var res = new Array(end-begin);
	for (var i=begin;i<end;i++) {
		res.push(i);
	}
	return res;
}

class TurnList {
	turns:any={};
	addTurn(x, y, direction) {
		if (!this.turns[x]) {
			this.turns[x] = {};
		}
		this.turns[x][y] = direction;
	}
	dropTurn(x:number, y:number) {
		if (this.turns[x] && this.turns[x][y]) {
			delete this.turns[x][y];
		}
	}
	turnForCoord(x:number, y:number) {
		if (this.turns[x] && this.turns[x][y]) {
			return this.turns[x][y];
		}
		else {
			return false;
		}
	}

}

class SnakeComponent implements Drawable {
	direction:number=DIRECTIONS.RIGHT;
	context:any;
	constructor(public snake:Snake, public pos:number, 
				public x:number, public y:number, public color?:string, direction?:number) {
		this.context = this.snake.context;
		if (direction != null) {
			this.direction = direction
		}
		if (!this.color) {
			this.color = "white";
		}
	}
	setCoords(x:number, y:number) {
		this.x = x;
		this.y = y;
	}
	getCoords() {
		return {x:this.x, y:this.y};
	}
	willCollide() {
		var nextX = this.getNextX();
		var nextY = this.getNextY();
		if (nextX < 0 || nextX > PLAYING_WIDTH || nextY < 0 || nextY > PLAYING_HEIGHT) {
			window.game.log("Snake exceeded playing area")
			return true
		}
		var comp:SnakeComponent;

		for (var i=0;i<this.snake.length;i++) {
			comp = this.snake.components[i];
			if (comp == this) continue;
			if (_.isEqual(comp.getNextCoords(),this.getNextCoords())) {
				console.log("Collision between snake components: ", this, comp);
				return true;
			}
		}
		return false;
	}
	willGetFood() {
		var f:Food;
		for (var i in window.game.foods) {
			f = window.game.foods[i];
			if (f.x == this.getNextX() && f.y == this.getNextY()) {
				return f;
			}
		}
		return null;
	}
	move() {
		var nextX:number, nextY:number;
		nextX = this.getNextX();
		nextY = this.getNextY();
		
		if (this.willCollide()) {
			return false;
		}
		var f:Food = this.willGetFood();
		if (f) {
			this.snake.eatFood(f);
		}

		this.setCoords(nextX, nextY);
		return true;
	}
	getNextX() {
		if (this.direction == DIRECTIONS.LEFT) {
			return this.x - MOVE_UNIT;
		}
		else if (this.direction == DIRECTIONS.RIGHT) {
			return this.x + MOVE_UNIT;
		}
		else {
			return this.x;
		}
	}
	getNextY() {
		if (this.direction == DIRECTIONS.UP) {
			return this.y - MOVE_UNIT;
		}
		else if (this.direction == DIRECTIONS.DOWN) {
			return this.y + MOVE_UNIT;
		}
		else {
			return this.y;
		}

	}
	getNextCoords() {
		var nextX, nextY;
		nextX = this.getNextX();
		nextY = this.getNextY();
	// 	var d = this.snake.turns.turnForCoord(nextX, nextY);
	// 	if (d) {
	// 		console.log("there's a d", d)
	// 		var old = this.direction;
	// 		this.direction = d;
	// 		nextX = this.getNextX();
	// 		nextY = this.getNextY();
	// 		this.direction = old;
	// 	}
		return [nextX, nextY];
	}
	render() {
		this.context.fillStyle = this.color;
		this.context.fillRect(this.x, this.y, SNAKE_BLOCK_BASE, SNAKE_BLOCK_BASE);
	}
}

class Snake implements Drawable {
	length:number=DEFAULT_LENGTH;
	x:number;
	y:number;
	snakeWidth:number;
	components:Array<SnakeComponent>;
	turns:TurnList;
	leadComponent:SnakeComponent;
	color:string;
	constructor(public context:any, public isAI:boolean){
		if (!this.isAI) {
			this.x = 0;
			this.y = 0;
			this.color = "white";
		}
		else {
			this.color = SNAKE_COLORS[_.random(0, 2)];
		}
		this.snakeWidth = this.calculateSnakeWidth();
		this.turns = new TurnList();

		
		this.components = [];
		for (var i=0;i<this.length;i++) {
			this.createComponent(i);
		}
		this.leadComponent = this.components[0];
	}
	createComponent(pos:number) {
		this.addComponent(new SnakeComponent(this, pos, (this.length*SNAKE_BLOCK_SIDE)-pos*SNAKE_BLOCK_SIDE, 0, this.color));
	}
	addComponent(component:SnakeComponent) {
		this.components.push(component);
	}
	calculateSnakeWidth() {
		return this.length * (SNAKE_BLOCK_SIDE);
	}
	render() {
		$.each(this.components, function(i:number, component:SnakeComponent) {
			component.render();
		});
	}
	set direction(dir:number) {
		if (dir == OPPOSITES[this.leadComponent.direction] || dir == this.leadComponent.direction){
			return;
		}
		this.turns.addTurn(this.leadComponent.x, this.leadComponent.y, dir);
	}
	move(coords?:CoordinatePair) {
		var direction:number;
		var component:SnakeComponent;
		var coords = [];
		for (var i=0;i<this.length;i++) {
			component = this.components[i];
			direction = this.turns.turnForCoord(component.x, component.y);
			if (direction) {
				component.direction = direction;
			}
			var moveSuccessful:boolean = component.move();
			if (!moveSuccessful) {
				return false;
			}
			if (i == 0) {
				this.turns.dropTurn(component.x, component.y);
			}
		};
		return true;
	}
	eatFood(food:Food) {
		window.game.foods.splice(window.game.foods.indexOf(food), 1);
		var last = this.components[this.length-1];
		var x:number, y:number;

		switch (last.direction) {
			case DIRECTIONS.UP:
				x = last.x;
				y = last.y+SNAKE_BLOCK_SIDE;
				break;
			case DIRECTIONS.DOWN:
				x = last.x;
				y = last.y-SNAKE_BLOCK_SIDE;
				break;
			case DIRECTIONS.LEFT:
				x = last.x + SNAKE_BLOCK_SIDE;
				y = last.y;
				break;
			case DIRECTIONS.RIGHT:
				x = last.x - SNAKE_BLOCK_SIDE;
				y = last.y;
				break;
		}

		this.addComponent(new SnakeComponent(this, this.length, x, y, "white", last.direction));
		this.length += 1;
		window.game.incrementScore();
	}
}

class AISnake extends Snake {
	constructor(public context) {
		super(context, true);
	}
}

class Food implements Drawable {
	x:number;
	y:number;
	constructor(public context) {
		this.x = SNAKE_BLOCK_SIDE*_.random((PLAYING_WIDTH-SNAKE_BLOCK_SIDE)/SNAKE_BLOCK_SIDE);
		this.y = SNAKE_BLOCK_SIDE*_.random((PLAYING_HEIGHT-SNAKE_BLOCK_SIDE*2)/SNAKE_BLOCK_SIDE);
	}
	render() {
		this.context.fillStyle = "#FFFFFF";
		this.context.beginPath();
		this.context.moveTo(this.x, this.y);
		this.context.lineTo(this.x+MOVE_UNIT, this.y);
		this.context.lineTo(this.x+(MOVE_UNIT/2), this.y+MOVE_UNIT);
		this.context.fill();
	}
}

class SnakeGame {
	canvas:HTMLElement;
	context:any;
	human:Snake;
	players:Array<Snake>;
	foods:Array<Food>;
	score:number=0;
	difficulty:number;
	constructor() {
		this.canvas = $("canvas")[0];
		this.context = this.canvas.getContext("2d");
		this.human = new Snake(this.context, false);
		this.players = [this.human];
		$(document.body).keydown(this.handleKeydown.bind(this));

		this.foods = [];
		this.setFoodInterval();
		this.loadDifficulty();
		$("#difficulty").click(this.handleDifficultyClick.bind(this));
		
		window.setTimeout(this.render.bind(this), 1);
	}
	handleKeydown(e:JQueryKeyEventObject) {
		if (e.keyCode == 13) {
			DISABLED = !DISABLED;
			if (DISABLED == false) {
				window.requestAnimationFrame(this.render.bind(this))
			}
		}
		else if ([37, 38, 39, 40].indexOf(e.keyCode) != -1){
			this.human.direction = (e.keyCode);
		}
	}
	handleDifficultyClick(e:JQueryMouseEventObject) {
		if (this.difficulty >= 10) {
			this.difficulty = 1;
		}
		else {
			this.difficulty += 1;
		}
		window.localStorage['difficulty'] = this.difficulty;
		this._updateDifficultyText();
	}
	_updateDifficultyText() {
		$("#difficulty-value").text(this.difficulty);
	}
	loadDifficulty() {
		if (window.localStorage['difficulty']) {
			this.difficulty = window.parseInt(window.localStorage['difficulty']);
		}
		else {
			this.difficulty = 1;
		}
		this._updateDifficultyText();
	}
	incrementScore(amount?:number, multiplyByDifficulty:boolean=true) {
		if (amount == null) {
			amount = 1;
		}
		if (multiplyByDifficulty) {
			amount = amount * this.difficulty;
		}

		this.score += amount;
		window.localStorage['lastScore'] = this.score;
		$("#score-value").text(this.score);
	}
	endGame(player:Snake) {
		DISABLED = true;
		$("#gameEnded-wrapper").show();
	}
	setFoodInterval() {
		window.setTimeout(this.createFood.bind(this), 500*_.random(1, 10));
	}
	createFood() {
		this.foods.push(new Food(this.context));
		this.setFoodInterval();
	}
	render() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
		this.context.fillStyle = "black";
		this.context.fillRect(0, 0, window.innerWidth, window.innerHeight);
		this.context.strokeStyle = "white";
		
		// lower boundary
		this.context.beginPath();
		this.context.moveTo(0, PLAYING_HEIGHT);
		this.context.lineTo(PLAYING_WIDTH, PLAYING_HEIGHT);
		this.context.stroke();
		this.context.closePath();


		for (var i in this.players) {
			if (!DISABLED) {
				var moveSuccessful:boolean = this.players[i].move();
				if (!moveSuccessful) {
					this.endGame(this.players[i]);
				}
			}
			this.players[i].render();
		}

		for (var i in this.foods) {
			this.foods[i].render();
		}

		if (!DISABLED) {
			window.setTimeout(function() {
				window.requestAnimationFrame(this.render.bind(this))
			}.bind(this), 1000/(3+(this.difficulty * 2)));
		}
	}
	log(txt:string) {
		console.log("LOG: ", txt);
	}
}
interface Window { game: SnakeGame; parseInt;}
$(document).ready(function() {
	window.game = new SnakeGame();
})