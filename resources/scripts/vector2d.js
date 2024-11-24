/**
 * A class holding the data for a 2d vector.
 */

class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Returns the x coordinate floored to an integer.
     */
    intX() {
        return Math.floor(this.x);
    }

    /**
     * Returns the y coordinate floored to an integer.
     */
    intY() {
        return Math.floor(this.y);
    }
}