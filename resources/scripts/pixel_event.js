/**
 * A class responsible for tracking all changed pixels during a single action.
 */

class PixelEvent {
    constructor(color) {
        this.color = color;
        this.pixel_list = [];
    }

    /**
     * Adds a new pixel to the list of changed pixels.
     * @param {Vector2D} pos 
     */
    add_pixel(pos) {
        this.pixel_list.push(pos);
    }
}