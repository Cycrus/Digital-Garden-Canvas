/**
 * Initiates all relevant objects and sets event listeners.
 */

let canvas_handle = new PixelCanvasHandle();

// TODO: Add image download function
// TODO: Add server side storage of image data

/**
 * General event listeners
 */
window.addEventListener('resize', () => {
    canvas_handle.resize_canvas();
    canvas_handle.full_render();
});
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

/**
 * Mouse event listeners.
 */
canvas_handle.canvas.addEventListener('mousedown', (event) => {
    if(canvas_handle.check_mouse_button(event, LEFT_BUTTON)) {
        if(canvas_handle.selected_tool == TOOL_DRAW) {
            canvas_handle.create_new_event(canvas_handle.selected_color);
            canvas_handle.set_pixel_callback(new Vector2D(event.clientX, event.clientY));
        }
        if(canvas_handle.selected_tool == TOOL_ERASE) {
            canvas_handle.create_new_event(canvas_handle.initial_color);
            canvas_handle.erase_pixel_callback(new Vector2D(event.clientX, event.clientY));
        }
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
canvas_handle.canvas.addEventListener('mouseup', (event) => {
    canvas_handle.finish_curr_event();
});
canvas_handle.canvas.addEventListener("wheel", (event) => {
    canvas_handle.zoom_callback(event.wheelDelta, 5);
});

/**
 * Touchscreen event listeners.
 */
canvas_handle.canvas.addEventListener("touchstart", (event) => {
    canvas_handle.reset_touch_distance();
    canvas_handle.reset_touch_motion();
    if(canvas_handle.selected_tool == TOOL_DRAW)
        canvas_handle.create_new_event(canvas_handle.selected_color);
    else if(canvas_handle.selected_tool == TOOL_ERASE)
        canvas_handle.create_new_event(canvas_handle.initial_color);
});
canvas_handle.canvas.addEventListener("touchend", (event) => {
    canvas_handle.reset_touch_distance();
    canvas_handle.reset_touch_motion();
    canvas_handle.finish_curr_event();
});
canvas_handle.canvas.addEventListener("touchcancel", (event) => {
    canvas_handle.reset_touch_distance();
    canvas_handle.reset_touch_motion();
    canvas_handle.finish_curr_event();
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

/**
 * Tool event listeners.
 */
canvas_handle.color_wheel.addEventListener("input", (event) => {
    canvas_handle.set_selected_color(event.target.value);
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
document.getElementById("tool_download").addEventListener("click", (event) => {
    canvas_handle.download_image();
});

/**
 * Starting up the canvas.
 */
canvas_handle.resize_canvas();

setInterval(() => {
    canvas_handle.poll_full_image();
}, 5000);
