import AbstractThing from './abstract-thing';
import Ball from './ball';
import { getPlayerControls } from '../controls';
import colors from '../colors';

const BALL_RELEASE_SPEED = 4;
const PADDLE_MOVE_SPEED = 8;
export const LEFT = 'left';
export const RIGHT = 'right';
export const TOP = 'top';
export const BOTTOM = 'bottom';

export const PADDLE_LENGTH = 64;

class Paddle extends AbstractThing
{
  constructor(g, options={}) {
    super(g, 'paddle');

    options.length || (options.length = PADDLE_LENGTH);

    this.sprite = g.rectangle(
      [TOP, BOTTOM].indexOf(options.position) > -1 ? options.length : 16,
      [TOP, BOTTOM].indexOf(options.position) > -1 ? 16 : options.length,
      colors[options.color].fill,
      colors[options.color].stroke,
      2
    );

    switch (options.position) {
      case TOP:
        g.stage.putTop(this.sprite, 0, 48);
        break;
      case RIGHT:
        g.stage.putRight(this.sprite, this.sprite.width * -1);
        break;
      case BOTTOM:
        g.stage.putBottom(this.sprite, 0, this.sprite.height * -1);
        break;
      case LEFT:
        g.stage.putLeft(this.sprite, this.sprite.width, 0);
        break;
      default:
        this.g.pause();
        throw new Error('invalid position');
    }

    this.position = options.position;
    this.color = options.color;
    this.player = options.player;
    this.antiCollisionFrames = {};
    this.initInput();
    this.controls = getPlayerControls(g, this.player);
  }

  attachStarterBall(ball) {
    this.caughtBall = ball;
    this.handleCaughtBall();
  }

  initVerticalControls() {
    this.controls.up.press = () => {
      this.upArrowDown = true;
      this.sprite.vy = PADDLE_MOVE_SPEED * -1;
    };
    this.controls.up.release = () => {
      this.upArrowDown = false;
      if (!this.controls.down.isDown) {
        this.sprite.vy = 0;
      }
    };
    this.controls.down.press = () => {
      this.downArrowDown = true;
      this.sprite.vy = PADDLE_MOVE_SPEED;
    };
    this.controls.down.release = () => {
      this.downArrowDown = false;
      if (!this.controls.up.isDown) {
        this.sprite.vy = 0;
      }
    };
  }

  initHorizontalControls() {
    this.controls.right.press = () => {
      this.rightArrowDown = true;
      this.sprite.vx = PADDLE_MOVE_SPEED;
    };
    this.controls.right.release = () => {
      this.rightArrowDown = false;
      if (!this.controls.left.isDown) {
        this.sprite.vx = 0;
      }
    };
    this.controls.left.press = () => {
      this.leftArrowDown = true;
      this.sprite.vx = PADDLE_MOVE_SPEED * -1;
    };
    this.controls.left.release = () => {
      this.leftArrowDown = false;
      if (!this.controls.right.isDown) {
        this.sprite.vx = 0;
      }
    };
  }

  initInput() {
    this.controls = getPlayerControls(this.g, this.player);

    if ([TOP, BOTTOM].indexOf(this.position) > -1) {
      this.initHorizontalControls();
    }
    if ([LEFT, RIGHT].indexOf(this.position) > -1) {
      this.initVerticalControls();
    }

    this.controls.action.press = () => {
      if (this.caughtBall) {
        this.releaseBall();
      }
    }
  }

  releaseBall() {
    if (this.caughtBall) {
      switch (this.position) {
        case BOTTOM:
          this.caughtBall.sprite.vy = BALL_RELEASE_SPEED * -1;
          this.caughtBall.sprite.vx = this.sprite.vx;
          break;
        case TOP:
          this.caughtBall.sprite.vy = BALL_RELEASE_SPEED;
          this.caughtBall.sprite.vx = this.sprite.vx;
          break;
        case LEFT:
          this.caughtBall.sprite.vy = this.sprite.vy;
          this.caughtBall.sprite.vx = BALL_RELEASE_SPEED;
          break;
        case RIGHT:
          this.caughtBall.sprite.vy = this.sprite.vy;
          this.caughtBall.sprite.vx = BALL_RELEASE_SPEED * -1;
          break;
      }
      this.caughtBall = null;
    }
  }

  handleCaughtBall() {
    if (this.caughtBall) {
      switch (this.position) {
        case TOP:
          this.sprite.putBottom(this.caughtBall.sprite);
          break;
        case LEFT:
          this.sprite.putRight(this.caughtBall.sprite);
          break;
        case BOTTOM:
          this.sprite.putTop(this.caughtBall.sprite);
          break;
        case RIGHT:
          this.sprite.putLeft(this.caughtBall.sprite);
          break;
      }
    }
  }

  update() {
    super.update();
    const g = this.g;

    g.move(this.sprite);

    this.handleCaughtBall();

    const bounds = Object.assign({}, g.stage.localBounds);
    if (this.position === TOP || this.position === BOTTOM) {
      bounds.x = 32;
      bounds.width -= 32;
    } else if (this.position === LEFT || this.position === RIGHT) {
      bounds.y = 64;
      bounds.height -= 32;
    }
    g.contain(this.sprite, bounds);
  }
}

export default Paddle;
