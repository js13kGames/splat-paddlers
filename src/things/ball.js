import AbstractThing from './abstract-thing';
import Block from './block';
import colors from '../colors';
import Paddle from './paddle';
import Pit from './pit';
import { TOP, LEFT, BOTTOM, RIGHT } from './paddle';
import { HUD_HEIGHT } from './hud';
import { lpad } from '../utils';

const BALL_SIZE = 8;
const MAX_BALL_SPEED = 6;
const EDGE_BOUNCES_BEFORE_TURNING_BLANK = 2;
const modToColor = {
  'stickyball': '#ffaa00',
  'powerball': '#b50000',
  'growball': '#00dd01',
  'shrinkball': '#ffc1c1',
  'mirrorball': '#822389',
  'asteroidball': '#5078fc',
};
export const MODS = Object.keys(modToColor);

class Ball extends AbstractThing
{
  constructor(g, color) {
    super(g, 'ball');

    this.color = color;
    this.mod = null;
    this.createSprite();
    this.edgeBounces = 0;
    this.collidesWith = ['paddle', 'block', 'pit'];
    this.mirroring = null;
  }

  changeMod(mod) {
    this.mod = mod;
    this.mirroring = null;
    this.prevMirroring = 0;
  }

  createSprite() {
    this.sprite = this.g.circle(
      BALL_SIZE,
      colors[this.color].fill,
      this.mod ? modToColor[this.mod] :colors[this.color].stroke,
      this.mod ? BALL_SIZE : 3,
    );
  }

  recreateSprite() {
    const oldSprite = this.sprite;
    this.remove();
    this.createSprite();
    this.sprite.x = oldSprite.x;
    this.sprite.y = oldSprite.y;
    this.sprite.vx = oldSprite.vx;
    this.sprite.vy = oldSprite.vy;
  }

  bounceOffBounds() {
    let bounced = false;
    if (this.sprite.x <= 0 || this.sprite.x >= this.g.stage.width - this.sprite.width) {
      this.sprite.vx *= -1; // left or right side bounce
      bounced = true;
    } else if (this.sprite.y <= HUD_HEIGHT || this.sprite.y >= this.g.stage.height - this.sprite.height) {
      this.sprite.vy *= -1; // top or bottom side bounce
      bounced = true;
    }
    if (bounced) {
      this.edgeBounces += 1;
    }
    if (this.edgeBounces >= EDGE_BOUNCES_BEFORE_TURNING_BLANK) {
      this.changeBallColor('blank');
      this.edgeBounces = 0;
    }
  }

  screenWrap() {
    if (this.screenWrappedLastFrame) {
      this.sprite.visible = true;
      this.screenWrappedLastFrame = false;
    }

    let before = [this.sprite.x, this.sprite.y];
    if (this.sprite.x < this.sprite.width * -1) {
      this.sprite.x = this.g.stage.width;
    }
    if (this.sprite.x > this.g.stage.width) {
      this.sprite.x = this.sprite.width * -1;
    }
    if (this.sprite.y < HUD_HEIGHT + this.sprite.height * -1) {
      this.sprite.y = this.g.stage.height;
    }
    if (this.sprite.y > this.g.stage.height) {
      this.sprite.y = HUD_HEIGHT - this.sprite.height;
    }

    // When changing a sprite's position, ga shows it moving across
    // the intervening space really fast, instead of just changing
    // its position instantanously, resulting in the sprite noticeably flickering
    // at some point on the screen. To get around this, make the sprite invisible
    // for one frame.
    if (before[0] !== this.sprite.x || before[1] !== this.sprite.y) {
      this.sprite.visible = false;
      this.screenWrappedLastFrame = true;
    }
  }

  releaseFromPit(pit) {
    this.createSprite();
    if (this.mod === 'asteroidball') {
      console.log('recreating hud sprite');
      // Recreate HUD sprite so that it remains on top, otherwise vertical
      // wrapping doesn't look right.
      this.g.collisionGroups.hud[0].recreateSprite();
    }

    let xySpeed = [
      this.g.randomInt(2, 3),
      this.g.randomInt(2, 3),
    ];
    // Double one of them so that the angle isn't such that it bounces back in the pit
    xySpeed[this.g.randomInt(0, 1)] *= 2;

    switch (pit.position) {
      case 'TOP LEFT':
        this.sprite.x = pit.sprite.x + pit.sprite.halfWidth;
        this.sprite.y = pit.sprite.y + pit.sprite.halfHeight;
        this.sprite.vx = xySpeed[0];
        this.sprite.vy = xySpeed[1];
        break;
      case 'TOP RIGHT':
        this.sprite.x = pit.sprite.x - pit.sprite.halfWidth;
        this.sprite.y = pit.sprite.y + pit.sprite.halfHeight;
        this.sprite.vx = xySpeed[0] * -1;
        this.sprite.vy = xySpeed[1];
        break;
      case 'BOTTOM LEFT':
        this.sprite.x = pit.sprite.x + pit.sprite.halfWidth;
        this.sprite.y = pit.sprite.y - pit.sprite.halfHeight;
        this.sprite.vx = xySpeed[0];
        this.sprite.vy = xySpeed[1] * -1;
        break;
      case 'BOTTOM RIGHT':
        this.sprite.x = pit.sprite.x - pit.sprite.halfWidth;
        this.sprite.y = pit.sprite.y - pit.sprite.halfHeight;
        this.sprite.vx = xySpeed[0] * -1;
        this.sprite.vy = xySpeed[1] * -1;
        break;
      default:
        this.g.pause();
        throw new Error(`Invalid pit position: ${pit.position}`)
    }

    this.antiCollisionFrames[pit.id] = 10;
  }

  changeBallColor(newColor) {
    this.color = newColor;
    this.recreateSprite();
  }

  bounceOff(otherThing) {
    this.edgeBounces = 0; // reset edge bounces
    const ball = this;
    const ballPos = ball.getPreviousPosition();
    const otherThingPos = otherThing.getPreviousPosition();

    if (otherThing instanceof Paddle && otherThing.color !== this.color) {
      this.changeBallColor(otherThing.color);
    }

    let hitRegion = null;

    if (ballPos.y + ball.sprite.height <= otherThingPos.y) {
      hitRegion = 'top';
    } else if (ballPos.x + ball.sprite.width <= otherThingPos.x) {
      hitRegion = 'left';
    } else if (ballPos.y >= otherThingPos.y + otherThing.sprite.height) {
      hitRegion = 'bottom';
    } else if (ballPos.x >= otherThingPos.x + otherThing.sprite.width) {
      hitRegion = 'right';
    } else {
      return;
    }

    if (hitRegion === 'left' || hitRegion === 'right') {
      // If otherThing moving in same direction as ball, add velocities
      if (ball.sprite.vx * otherThing.sprite.vx > 0) {
        ball.sprite.vx += otherThing.sprite.vx;
      } else {
        ball.sprite.vx = (ball.sprite.vx * -1) + otherThing.sprite.vx;
      }
      ball.sprite.vy += otherThing.sprite.vy;
      // Limit max speed
      ball.sprite.vx = Math.min(Math.abs(ball.sprite.vx), MAX_BALL_SPEED) * (ball.sprite.vx < 0 ? -1 : 1);
      ball.sprite.vy = Math.min(Math.abs(ball.sprite.vy), MAX_BALL_SPEED) * (ball.sprite.vy < 0 ? -1 : 1);
    } else {
      // If otherThing moving in same direction as ball, add velocities
      if (ball.sprite.vy * otherThing.sprite.vy > 0) {
        ball.sprite.vy += otherThing.sprite.vy;
      } else {
        ball.sprite.vy = (ball.sprite.vy * -1) + otherThing.sprite.vy;
      }
      ball.sprite.vx += otherThing.sprite.vx;
      // Limit max speed
      ball.sprite.vy = Math.min(Math.abs(ball.sprite.vy), MAX_BALL_SPEED) * (ball.sprite.vy < 0 ? -1 : 1);
      ball.sprite.vx = Math.min(Math.abs(ball.sprite.vx), MAX_BALL_SPEED) * (ball.sprite.vx < 0 ? -1 : 1);
    }
  }

  handleCollision(otherThing) {
    if (
      otherThing instanceof Paddle ||
      (
        otherThing instanceof Block &&
        otherThing.color !== 'blank' &&
        otherThing.color !== this.color
      )
    ) {
      if (otherThing instanceof Paddle && this.mod === 'stickyball' && !otherThing.caughtBall) {
        otherThing.attachBall(this);
        this.changeMod(null);
        this.color = otherThing.color;
        this.recreateSprite();
      } else {
        if (!(otherThing instanceof Block && this.mod === 'powerball')) {
          if (otherThing instanceof Paddle && this.mod === 'mirrorball') {
            this.mirroring = otherThing.position;
          }
          this.bounceOff(otherThing);
        }
      }
    } else if (otherThing instanceof Pit) {
      this.remove();
      this.sprite = null;
    }
  }

  setMirrorDirection(direction) {
    if (!this.mirroring) {
      return;
    }
    const multiplier = 2;
    if (this.mirroring === 'top' || this.mirroring === 'bottom') {
      if (direction === 0) {
        this.sprite.vx += this.prevMirroring * multiplier;
      } else {
        this.sprite.vx += direction * multiplier;
      }
    } else {
      if (direction === 0) {
        this.sprite.vy += this.prevMirroring * multiplier;
      } else {
        this.sprite.vy += direction * multiplier;
      }
    }
    this.prevMirroring = direction;
  }

  update() {
    super.update();
    if (this.sprite) {
      if (this.mod === 'asteroidball') {
        this.screenWrap();
      } else {
        this.bounceOffBounds();
      }
      this.g.move(this.sprite);
    }
  }
}

export default Ball;
