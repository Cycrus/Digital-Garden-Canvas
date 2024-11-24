const LEFT_BUTTON = 1;
const RIGHT_BUTTON = 2;
const MIDDLE_BUTTON = 4;

class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    intX() {
        return Math.floor(this.x);
    }
    intY() {
        return Math.floor(this.y);
    }
}

class PixelCanvasHandle {
    constructor() {
        this.default_scale = 10;
        this.min_scale = 5;
        this.scale_step = 5;
        this.max_scale = 100;
        this.scale = this.default_scale;
        this.size = new Vector2D(1000, 1000);
        this.camera_pos = new Vector2D(0, 0);

        this.canvas = document.getElementById("pixel_canvas");
        this.camera_label = document.getElementById("camera_label");
        this.color_wheel = document.getElementById("color_wheel");

        this.initial_color = "#000000";
        this.selected_color = this.color_wheel.value;

        this.context = this.canvas.getContext("2d");
        this.image_data = new Array(this.size.y);
        for(let y = 0; y < this.size.y; y++) {
            this.image_data[y] = new Array(this.width);
            for(let x = 0; x < this.size.x; x++) {
                this.image_data[y][x] = this.initial_color;
            }
        }
    }

    set_selected_color(color) {
        this.selected_color = color;
    }

    update_camera_label() {
        let zoom_percentage = Math.floor(this.scale / this.default_scale * 100)
        this.camera_label.innerText = Math.floor(this.camera_pos.x) + " | " + Math.floor(this.camera_pos.y) + " (" + zoom_percentage + "%)";
    }

    full_render() {
        let render_width = Math.floor(this.camera_pos.x + window.innerWidth / this.scale) + 2;
        let render_height = Math.floor(this.camera_pos.y + window.innerHeight / this.scale) + 2;
        let render_pos = new Vector2D(0, 0);
        for(let y = this.camera_pos.y; y < render_height; y++) {
            for(let x = this.camera_pos.x; x < render_width; x++) {
                render_pos.x = x;
                render_pos.y = y;
                this.render_pixel(render_pos);
            }
        }
        this.update_camera_label();
    }

    poll() {

    }

    is_out_of_bounds(pos) {
        return (pos.x >= this.size.x || pos.y >= this.size.y || pos.x < 0 || pos.y < 0);
    }

    is_out_of_screen(pos) {
        return (pos.x >= window.innerWidth / this.scale || pos.y >= window.innerHeight / this.scale || pos.x < 0 || pos.y < 0);
    }

    camera_correct_coordinate(pos, factor = 1) {
        return new Vector2D(pos.x - this.camera_pos.intX() * factor,
                            pos.y - this.camera_pos.intY() * factor);
    }

    check_mouse_button(event, button_code) {
        let buttons = event.buttons;
        return (buttons & button_code) != 0;
    }

    // TODO: Bug - Here is a bug, where zooming out at the very right/bottom of the canvas stucks the camera.
    move_camera(move_delta) {
        let new_camera_pos = new Vector2D(this.camera_pos.x - move_delta.x,
                                          this.camera_pos.y - move_delta.y);
        if(new_camera_pos.x < 0)
            new_camera_pos.x = 0;
        if(new_camera_pos.y < 0)
            new_camera_pos.y = 0;
        if(new_camera_pos.x + window.innerWidth / this.scale >= this.size.x)
            new_camera_pos.x = this.camera_pos.x;
        if(new_camera_pos.y + window.innerHeight / this.scale >= this.size.y)
            new_camera_pos.y = this.camera_pos.y;
        this.camera_pos = new_camera_pos;
    }

    move_camera_callback(event) {
        if(!this.check_mouse_button(event, MIDDLE_BUTTON))
            return false;

        let move_delta = new Vector2D(event.movementX / this.scale,
                                      event.movementY / this.scale);
        this.move_camera(move_delta);
        this.full_render();
    }

    zoom(factor) {
        let new_scale = this.scale + factor;
        if(new_scale < this.min_scale)
            new_scale = this.min_scale;
        if(new_scale > this.max_scale)
            new_scale = this.max_scale;
        this.scale = new_scale;
    }

    zoom_callback(event) {
        if(event.wheelDelta > 0) {
            this.zoom(this.scale_step);
        }
        else if(event.wheelDelta < 0) {
            this.zoom(-this.scale_step);
        }
        this.full_render();
    }

    render_pixel(pos) {
        if(this.is_out_of_bounds(pos))
            return false;
        let data_pos = pos;
        let render_pos = this.camera_correct_coordinate(data_pos);
        render_pos = new Vector2D(render_pos.intX(), render_pos.intY());
        if(this.is_out_of_screen(render_pos))
            return false;
        this.context.fillStyle = this.image_data[data_pos.intY()][data_pos.intX()];
        this.context.fillRect(render_pos.x * this.scale, render_pos.y * this.scale, this.scale, this.scale);
        return true;
    }

    set_pixel(pos, color) {
        if(this.is_out_of_bounds(pos))
            return false;
        this.image_data[pos.intY()][pos.intX()] = color;
        return true;
    }

    get_pixel(pos) {
        if(this.is_out_of_bounds(pos))
            return undefined;
        return this.image_data[pos.intY()][pos.intX()];
    }

    set_pixel_callback(event, force = false) {
        if(!force && !this.check_mouse_button(event, LEFT_BUTTON))
            return;

        let cursor_pos = new Vector2D(Math.floor(event.clientX / this.scale),
                                      Math.floor(event.clientY / this.scale));
        let camera_corrected_cursor_pos = this.camera_correct_coordinate(cursor_pos, -1);

        if(this.is_out_of_bounds(camera_corrected_cursor_pos))
            return;
        if(this.get_pixel(camera_corrected_cursor_pos) == this.selected_color)
            return;

        this.set_pixel(camera_corrected_cursor_pos, this.selected_color);
        this.render_pixel(camera_corrected_cursor_pos);
    }

    resizeCanvas() {
        const widthInPixels = Math.floor(window.innerWidth);
        const heightInPixels = Math.floor(window.innerHeight);
    
        this.canvas.width = widthInPixels;
        this.canvas.height = heightInPixels;
    }
};

let canvas_handle = new PixelCanvasHandle();
window.addEventListener('resize', () => {
    canvas_handle.resizeCanvas();
    canvas_handle.full_render();
});

// TODO: Add full touch screen support
// TODO: Add color picker
// TODO: Add image download function
// TODO: Add server side storage of image data
canvas_handle.color_wheel.addEventListener("input", (event) => {
    canvas_handle.set_selected_color(event.target.value);
});

canvas_handle.canvas.addEventListener('mousedown', (event) => {
    if(canvas_handle.check_mouse_button(event, LEFT_BUTTON)) {
        canvas_handle.set_pixel_callback(event, true);
    }
});
canvas_handle.canvas.addEventListener('mousemove', (event) => {
    canvas_handle.set_pixel_callback(event);
    canvas_handle.move_camera_callback(event);
});
canvas_handle.canvas.addEventListener("wheel", (event) => {
    canvas_handle.zoom_callback(event);
});

function listAllProperties(obj) {
    let props = [];
    while (obj) {
        props = props.concat(Object.getOwnPropertyNames(obj));
        obj = Object.getPrototypeOf(obj);
    }
    return props;
}

const obj = { name: "John", age: 30 };
console.log(listAllProperties(obj));
canvas_handle.canvas.addEventListener("touchmove", (event) => {
    
});

canvas_handle.resizeCanvas();
canvas_handle.full_render();
