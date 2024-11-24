const LEFT_BUTTON = 1;
const RIGHT_BUTTON = 2;
const MIDDLE_BUTTON = 4;

const TOOL_DRAW = 0;
const TOOL_ERASE = 1;
const TOOL_PIPETTE = 2;
const TOOL_MOVE = 3;

const BRUSH_SIZE_1 = 1;
const BRUSH_SIZE_2 = 2;
const BRUSH_SIZE_3 = 4;
const BRUSH_SIZE_4 = 8;


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


class PixelEvent {
    constructor(color) {
        this.color = color;
        this.pixel_list = [];
    }
}


class PixelCanvasHandle {
    constructor() {
        this.default_scale = 10;
        this.min_scale = 5;
        this.max_scale = 100;
        this.scale = this.default_scale;
        this.size = new Vector2D(1000, 1000);
        this.camera_pos = new Vector2D(0, 0);

        this.canvas = document.getElementById("pixel_canvas");
        this.camera_label = document.getElementById("camera_label");
        this.color_wheel = document.getElementById("color_wheel");
        this.brush_size_picker = document.getElementById("size_picker");

        this.tools = new Map();
        this.tools.set(TOOL_DRAW, document.getElementById("tool_draw"))
        this.tools.set(TOOL_ERASE, document.getElementById("tool_erase"));
        this.tools.set(TOOL_PIPETTE, document.getElementById("tool_pipette"));
        this.tools.set(TOOL_MOVE, document.getElementById("tool_move"));

        this.brush_size_icons = new Map();
        this.brush_size_icons.set(BRUSH_SIZE_1, "resources/icons/size_icon_1.png");
        this.brush_size_icons.set(BRUSH_SIZE_2, "resources/icons/size_icon_2.png");
        this.brush_size_icons.set(BRUSH_SIZE_3, "resources/icons/size_icon_3.png");
        this.brush_size_icons.set(BRUSH_SIZE_4, "resources/icons/size_icon_4.png");

        this.initial_color = "#000000";
        this.selected_color = this.color_wheel.value;
        this.selected_tool = TOOL_DRAW;
        this.brush_size = BRUSH_SIZE_1;

        this.prev_touch_position = new Vector2D(0.0, 0.0);
        this.curr_touch_position = new Vector2D(0.0, 0.0);

        this.prev_touch_distance = 0.0;
        this.curr_touch_distance = 0.0;

        this.context = this.canvas.getContext("2d");
        this.image_data = new Array(this.size.y);
        for(let y = 0; y < this.size.y; y++) {
            this.image_data[y] = new Array(this.width);
            for(let x = 0; x < this.size.x; x++) {
                this.image_data[y][x] = this.initial_color;
            }
        }
    }

    reset_touch_distance() {
        this.prev_touch_distance = 0.0;
        this.curr_touch_distance = 0.0;
    }

    reset_touch_motion() {
        this.prev_touch_position.x = 0.0;
        this.prev_touch_position.y = 0.0;
        this.curr_touch_position.x = 0.0;
        this.curr_touch_position.y = 0.0;
    }

    update_touch_motion(pos) {
        this.prev_touch_position = this.curr_touch_position;
        this.curr_touch_position = pos;
    }

    update_touch_distance(pos1, pos2) {
        this.prev_touch_distance = this.curr_touch_distance;
        this.curr_touch_distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + 
                                             Math.pow(pos2.y - pos1.y, 2));
    }

    get_touch_motion() {
        if(this.curr_touch_position.x == 0.0 && this.curr_touch_position.y == 0.0 ||
            this.prev_touch_position.x == 0.0 && this.prev_touch_position.y == 0.0) {
            return new Vector2D(0.0, 0.0);
        }
        return new Vector2D(this.curr_touch_position.x - this.prev_touch_position.x,
                            this.curr_touch_position.y - this.prev_touch_position.y);
    }

    get_touch_zoom() {
        if(this.curr_touch_distance == 0.0 || this.prev_touch_distance == 0.0) {
            return 0.0;
        }
        return this.curr_touch_distance - this.prev_touch_distance;
    }

    switch_tool(tool_id) {
        if(tool_id == this.selected_tool)
            return;
        this.tools.get(tool_id).className = "active_icon";
        this.tools.get(this.selected_tool).className = "inactive_icon";
        this.selected_tool = tool_id;
    }

    rotate_brush_size() {
        this.brush_size *= 2;
        if(this.brush_size > BRUSH_SIZE_4)
            this.brush_size = BRUSH_SIZE_1;
        this.brush_size_picker.src = this.brush_size_icons.get(this.brush_size);
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

    move_camera_callback(movement) {
        let move_delta = new Vector2D(movement.x / this.scale,
                                      movement.y / this.scale);
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

    zoom_callback(direction, zoom_amount) {
        if(direction > 0) {
            this.zoom(zoom_amount);
        }
        else if(direction < 0) {
            this.zoom(-zoom_amount);
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

    get_pixel(pos) {
        if(this.is_out_of_bounds(pos))
            return undefined;
        return this.image_data[pos.intY()][pos.intX()];
    }

    erase_pixel_callback(pos) {
        let old_color = this.selected_color;
        this.selected_color = this.initial_color;
        this.set_pixel_callback(pos);
        this.selected_color = old_color;
    }

    set_pixel(pos, color) {
        if(this.is_out_of_bounds(pos))
            return false;
        this.image_data[pos.intY()][pos.intX()] = color;
        return true;
    }

    set_pixel_callback(pos) {
        let half_size = Math.floor(this.brush_size / 2);
        let lower_bound = -half_size;
        let upper_bound = half_size;
        if(half_size == 0) {
            lower_bound = 0;
            upper_bound = 1;
        }
        let cursor_pos = new Vector2D(Math.floor(pos.x / this.scale),
                                      Math.floor(pos.y / this.scale));
        for(let y = lower_bound; y < upper_bound; y++) {
            for(let x = lower_bound; x < upper_bound; x++) {
                let pixel_pos = new Vector2D(cursor_pos.x + x, cursor_pos.y + y);
                let camera_corrected_pixel_pos = this.camera_correct_coordinate(pixel_pos, -1);

                if(this.is_out_of_bounds(camera_corrected_pixel_pos))
                    continue;
                if(this.get_pixel(camera_corrected_pixel_pos) == this.selected_color)
                    continue;

                this.set_pixel(camera_corrected_pixel_pos, this.selected_color);
                this.render_pixel(camera_corrected_pixel_pos);
            }
        }
    }

    copy_pixel_callback(pos) {
        let cursor_pos = new Vector2D(Math.floor(pos.x / this.scale),
                                      Math.floor(pos.y / this.scale));
        let camera_corrected_cursor_pos = this.camera_correct_coordinate(cursor_pos, -1);

        if(this.is_out_of_bounds(camera_corrected_cursor_pos))
            return;
        if(this.get_pixel(camera_corrected_cursor_pos) == this.selected_color)
            return;

        this.selected_color = this.get_pixel(camera_corrected_cursor_pos);
        this.color_wheel.value = this.selected_color;
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
// TODO: Add all tools in the list
// TODO: Add image download function
// TODO: Add server side storage of image data
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

canvas_handle.color_wheel.addEventListener("input", (event) => {
    canvas_handle.set_selected_color(event.target.value);
});

canvas_handle.canvas.addEventListener('mousedown', (event) => {
    if(canvas_handle.check_mouse_button(event, LEFT_BUTTON)) {
        if(canvas_handle.selected_tool == TOOL_DRAW)
            canvas_handle.set_pixel_callback(new Vector2D(event.clientX, event.clientY));
        if(canvas_handle.selected_tool == TOOL_ERASE)
            canvas_handle.erase_pixel_callback(new Vector2D(event.clientX, event.clientY));
        if(canvas_handle.selected_tool == TOOL_PIPETTE)
            canvas_handle.copy_pixel_callback(new Vector2D(event.clientX, event.clientY));
    }

    if(canvas_handle.check_mouse_button(event, RIGHT_BUTTON)) {
        canvas_handle.erase_pixel_callback(new Vector2D(event.clientX, event.clientY));
    }
});
canvas_handle.canvas.addEventListener('mousemove', (event) => {
    if(canvas_handle.check_mouse_button(event, LEFT_BUTTON)) {
        if(canvas_handle.selected_tool == TOOL_DRAW)
            canvas_handle.set_pixel_callback(new Vector2D(event.clientX, event.clientY));
        if(canvas_handle.selected_tool == TOOL_MOVE)
            canvas_handle.move_camera_callback(new Vector2D(event.movementX, event.movementY));
        if(canvas_handle.selected_tool == TOOL_ERASE)
            canvas_handle.erase_pixel_callback(new Vector2D(event.clientX, event.clientY));
    }

    if(canvas_handle.check_mouse_button(event, RIGHT_BUTTON)) {
        canvas_handle.erase_pixel_callback(new Vector2D(event.clientX, event.clientY));
    }

    if(canvas_handle.check_mouse_button(event, MIDDLE_BUTTON)) {
        canvas_handle.move_camera_callback(new Vector2D(event.movementX, event.movementY));
    }
});
canvas_handle.canvas.addEventListener("wheel", (event) => {
    canvas_handle.zoom_callback(event.wheelDelta, 5);
});

canvas_handle.canvas.addEventListener("touchstart", (event) => {
    canvas_handle.reset_touch_distance();
    canvas_handle.reset_touch_motion();
});
canvas_handle.canvas.addEventListener("touchend", (event) => {
    canvas_handle.reset_touch_distance();
    canvas_handle.reset_touch_motion();
});
canvas_handle.canvas.addEventListener("touchcancel", (event) => {
    canvas_handle.reset_touch_distance();
    canvas_handle.reset_touch_motion();
});
canvas_handle.canvas.addEventListener("touchmove", (event) => {
    if(event.touches.length === 1) {
        if(canvas_handle.selected_tool == TOOL_DRAW)
            canvas_handle.set_pixel_callback(new Vector2D(event.touches[0].clientX, event.touches[0].clientY));
        if(canvas_handle.selected_tool == TOOL_MOVE) {
            canvas_handle.update_touch_motion(new Vector2D(event.touches[0].clientX, event.touches[0].clientY))
            canvas_handle.move_camera_callback(canvas_handle.get_touch_motion());
        }
        if(canvas_handle.selected_tool == TOOL_ERASE)
            canvas_handle.erase_pixel_callback(new Vector2D(event.touches[0].clientX, event.touches[0].clientY));
    }
    else if(event.touches.length === 2) {
        if(canvas_handle.selected_tool == TOOL_MOVE) {
            canvas_handle.update_touch_distance(new Vector2D(event.touches[0].clientX, event.touches[0].clientY),
                                                new Vector2D(event.touches[1].clientX, event.touches[1].clientY));
            canvas_handle.zoom_callback(canvas_handle.get_touch_zoom(), 1);
        }
    }
});

document.getElementById("size_picker").addEventListener("click", (event) => {
    canvas_handle.rotate_brush_size();
});
document.getElementById("tool_draw").addEventListener("click", (event) => {
    canvas_handle.switch_tool(TOOL_DRAW);
});
document.getElementById("tool_erase").addEventListener("click", (event) => {
    canvas_handle.switch_tool(TOOL_ERASE);
});
document.getElementById("tool_pipette").addEventListener("click", (event) => {
    canvas_handle.switch_tool(TOOL_PIPETTE);
});
document.getElementById("tool_move").addEventListener("click", (event) => {
    canvas_handle.switch_tool(TOOL_MOVE);
});

canvas_handle.resizeCanvas();
canvas_handle.full_render();
