/**
 * A class responsible for handling all actions on the local canvas.
 */

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


class PixelCanvasHandle {
    constructor() {
        const script_url = document.currentScript.src;
        const url = new URL(script_url);
        this.server_url = `${url.protocol}//${url.host}`;

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

        this.curr_event = undefined;

        this.prev_touch_position = new Vector2D(0.0, 0.0);
        this.curr_touch_position = new Vector2D(0.0, 0.0);

        this.prev_touch_distance = 0.0;
        this.curr_touch_distance = 0.0;

        this.context = this.canvas.getContext("2d");
        this.image_data = this.poll_full_image();
    }

    /**
     * Sends a pixel event to the server to update the remote main version of the image.
     * @param {PixelEvent} event The pixel event to send to the server.
     */
    send_pixel_event(event) {
        fetch(this.server_url + "/queue_event", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
        })
        .catch(error => {
            console.error("Error queueing event:", error);
        });
    }

    /**
     * Polls the full image from the server and assigns the local image with the polled one.
     */
    poll_full_image() {
        fetch(this.server_url + "/poll_full_image")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log("Polled full image from server.");
                this.size.x = data["size_x"];
                this.size.y = data["size_y"];
                this.image_data = data["image"];
                this.blit_event_buffer_onto_image();
                this.full_render();
            })
            .catch(error => {
                console.error("Not able to poll full image.", error);
            });
    }

    /**
     * Copies the pixel event buffer onto the image, so that it does not suddenly vanish during polling.
     */
    blit_event_buffer_onto_image() {
        if(this.curr_event == undefined)
            return;
        let color = this.curr_event.color;
        let pixel_list = this.curr_event.pixel_list;
        for(let i = 0; i < pixel_list.length; i++) {
            let x = pixel_list[i].intX();
            let y = pixel_list[i].intY();
            this.image_data[y][x] = color;
        }
    }

    /**
     * Posts a task to an asynchronous download worker to convert the image data into a png image.
     * When the png image is returned, the image can be downloaded.
     */
    download_image() {
        const worker = new Worker('resources/scripts/download_worker.js');
    
        worker.postMessage({
            image_data: this.image_data,
            size: this.size
        });
    
        worker.onmessage = (event) => {
            const png_data_url = event.data;
            const link = document.createElement('a');
            link.href = png_data_url;
            link.download = 'image.png';
            link.click();
        };
    }

    /**
     * Starts the tracking of a new pixel setting event.
     */
    create_new_event() {
        this.curr_event = new PixelEvent(this.selected_color);
    }

    /**
     * Ends the tracking of a new pixel setting event.
     */
    finish_curr_event() {
        this.send_pixel_event(this.curr_event);
        this.curr_event = undefined;
    }

    /**
     * Resets the distances between both fingers on the touchscreen.
     */
    reset_touch_distance() {
        this.prev_touch_distance = 0.0;
        this.curr_touch_distance = 0.0;
    }

    /**
     * Resets the positions of the finger on the touchscreen.
     */
    reset_touch_motion() {
        this.prev_touch_position.x = 0.0;
        this.prev_touch_position.y = 0.0;
        this.curr_touch_position.x = 0.0;
        this.curr_touch_position.y = 0.0;
    }

    /**
     * Updates the touchscreen finger positions for motion computations.
     * @param {Vector2D} pos The current position of the finger on the touchscreen.
     */
    update_touch_motion(pos) {
        this.prev_touch_position = this.curr_touch_position;
        this.curr_touch_position = pos;
    }

    /**
     * Updates the touchscreen distances between both fingers on the touchscreen during a zoom action.
     * @param {Vector2D} pos1 The position of the first finger.
     * @param {Vector2D} pos2 The position of the second finger.
     */
    update_touch_distance(pos1, pos2) {
        this.prev_touch_distance = this.curr_touch_distance;
        this.curr_touch_distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + 
                                             Math.pow(pos2.y - pos1.y, 2));
    }

    /**
     * Computes and returns the current motion vector of the finger on the touchscreen.
     * @returns The motion vector.
     */
    get_touch_motion() {
        if(this.curr_touch_position.x == 0.0 && this.curr_touch_position.y == 0.0 ||
            this.prev_touch_position.x == 0.0 && this.prev_touch_position.y == 0.0) {
            return new Vector2D(0.0, 0.0);
        }
        return new Vector2D(this.curr_touch_position.x - this.prev_touch_position.x,
                            this.curr_touch_position.y - this.prev_touch_position.y);
    }

    /**
     * Computes and returns the current difference between the previous and the current
     * finger distance of both fingers on the touchscreen.
     * @returns The difference between previous and current finger distances.
     */
    get_touch_zoom() {
        if(this.curr_touch_distance == 0.0 || this.prev_touch_distance == 0.0) {
            return 0.0;
        }
        return this.curr_touch_distance - this.prev_touch_distance;
    }

    /**
     * Switches the currently active tool.
     * @param {int} tool_id The id of the newly selected tool.
     */
    switch_tool(tool_id) {
        if(tool_id == this.selected_tool)
            return;
        this.tools.get(tool_id).className = "active_icon";
        this.tools.get(this.selected_tool).className = "inactive_icon";
        this.selected_tool = tool_id;
    }

    /**
     * Rotates through the different brush size options in increasing order.
     */
    rotate_brush_size() {
        this.brush_size *= 2;
        if(this.brush_size > BRUSH_SIZE_4)
            this.brush_size = BRUSH_SIZE_1;
        this.brush_size_picker.src = this.brush_size_icons.get(this.brush_size);
    }

    /**
     * Sets a new color string to teh currently selected color.
     * @param {string} color The new color to set the brush to.
     */
    set_selected_color(color) {
        this.selected_color = color;
    }

    /**
     * Updates the camera label on the canvas, which shows position and zoom factor.
     */
    update_camera_label() {
        let zoom_percentage = Math.floor(this.scale / this.default_scale * 100)
        this.camera_label.innerText = Math.floor(this.camera_pos.x) + " | " + Math.floor(this.camera_pos.y) + " (" + zoom_percentage + "%)";
    }

    /**
     * Performs a full render of the image on the canvas based on camera position and zoom factor.
     * Is optimized with view culling.
     */
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

    /**
     * Checks if a coordinate is out of the image bounds.
     * @param {Vector2D} pos The position to check.
     * @returns True if out of bounds.
     */
    is_out_of_bounds(pos) {
        return (pos.x >= this.size.x || pos.y >= this.size.y || pos.x < 0 || pos.y < 0);
    }

    /**
     * Checks if a coordinate is out of bounds of the screen canvas.
     * @param {Vector2D} pos The position to check.
     * @returns True if out of bounds.
     */
    is_out_of_screen(pos) {
        return (pos.x >= window.innerWidth / this.scale || pos.y >= window.innerHeight / this.scale || pos.x < 0 || pos.y < 0);
    }

    /**
     * Corrects a coordinate by adding the camera movment to it.
     * @param {Vector2D} pos The position to correct.
     * @param {int} factor Either 1 or -1. Defines if camera movement is added or subtracted.
     * @returns The camera corrected coordinate.
     */
    camera_correct_coordinate(pos, factor = 1) {
        return new Vector2D(pos.x - this.camera_pos.intX() * factor,
                            pos.y - this.camera_pos.intY() * factor);
    }

    /**
     * Checks an event for a certain pressed mouse button.
     * @param {MouseEvent} event The event to check.
     * @param {*} button_code The mouse button code to check for.
     * @returns True if the mouse button is pressed.
     */
    check_mouse_button(event, button_code) {
        let buttons = event.buttons;
        return (buttons & button_code) != 0;
    }

    // TODO: Bug - Here is a bug, where zooming out at the very right/bottom of the canvas stucks the camera.
    /**
     * Moves the camera for a certain delta.
     * @param {Vector2D} move_delta The amount and direction to move the camera.
     */
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

    /**
     * The callback wrapper for the camera movement called by the event listeners.
     * @param {Vector2D} movement The movement of the camera in pixels.
     */
    move_camera_callback(movement) {
        let move_delta = new Vector2D(movement.x / this.scale,
                                      movement.y / this.scale);
        this.move_camera(move_delta);
        this.full_render();
    }

    /**
     * Zooms the canvas for a certain amount.
     * @param {float} factor 
     */
    zoom(factor) {
        let new_scale = this.scale + factor;
        if(new_scale < this.min_scale)
            new_scale = this.min_scale;
        if(new_scale > this.max_scale)
            new_scale = this.max_scale;
        this.scale = new_scale;
    }

    /**
     * The callback wrapper for the camera zoom called by the event listeners.
     * @param {float} direction A float, which indicates with its sign the direction to zoom (in or out).
     * @param {int} zoom_amount An integer indicating the amount to zoom.
     */
    zoom_callback(direction, zoom_amount) {
        if(direction > 0) {
            this.zoom(zoom_amount);
        }
        else if(direction < 0) {
            this.zoom(-zoom_amount);
        }
        this.full_render();
    }

    /**
     * Renders a single pixel on the canvas. Camera corrects the provided position.
     * @param {Vector2D} pos The position of the pixel to render in image pixels.
     * @returns True if everything went ok.
     */
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

    /**
     * Returns a color of a pixel on the image. Does not camera correct.
     * @param {Vector2D} pos The image position to get.
     * @returns The color of the provided pixel position.
     */
    get_pixel(pos) {
        if(this.is_out_of_bounds(pos))
            return undefined;
        return this.image_data[pos.intY()][pos.intX()];
    }

    /**
     * The callback wrapper for the pixel eraser called by the event listener. Calls the pixel setting
     * routine with the background color.
     * @param {Vector2D} pos The position of the pixel to remove in canvas pixels.
     */
    erase_pixel_callback(pos) {
        let old_color = this.selected_color;
        this.selected_color = this.initial_color;
        this.set_pixel_callback(pos);
        this.selected_color = old_color;
    }

    /**
     * Sets the color of a certain pixel on the image.
     * @param {Vector2D} pos The position of the pixel to set in image pixels.
     * @param {string} color The color string to set the pixel to.
     * @returns 
     */
    set_pixel(pos, color) {
        if(this.is_out_of_bounds(pos))
            return false;
        this.image_data[pos.intY()][pos.intX()] = color;
        if(this.curr_event != undefined)
            this.curr_event.add_pixel(new Vector2D(pos.intX(), pos.intY()));
        return true;
    }

    /**
     * The callback wrapper for the pixel setting called by the event listeners. Performs a pixel
     * set for each pixel under the brush while considering its size.
     * @param {Vector2D} pos The center of the brush in canvas pixels.
     */
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

    /**
     * The callback wrapper for the pixel color copy called by teh event listeners. Sets the
     * currently selected color to the pixel color.
     * @param {Vector2D} pos The position of the pixel to copy in canvas pixels.
     * @returns 
     */
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

    /**
     * Resizes the canvas to the full window span. Called by the resize event listener.
     */
    resize_canvas() {
        const widthInPixels = Math.floor(window.innerWidth);
        const heightInPixels = Math.floor(window.innerHeight);
    
        this.canvas.width = widthInPixels;
        this.canvas.height = heightInPixels;
    }
};
