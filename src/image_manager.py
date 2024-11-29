"""
The image manager class, which handles the server side image version.
"""

from . import Image
import pickle
import os
from threading import Lock, Thread, Event
from datetime import datetime
import shutil
import queue

class ImageManager:
    def __init__(self):
        self.image_lock = Lock()
        self.image_filename = "image_0"
        self.current_image_path = "images" + os.sep + "current"
        self.init_color = 0  # Black
        self.image = Image()
        self.save_interval = 2
        self.backup_check_interval = 60 * 60 * 24
        self.pixel_change_queue = queue.Queue()
        self.stop_event = Event()
        self.save_worker = Thread(target=self.save_worker_fun)
        self.backup_worker = Thread(target=self.backup_worker_fun)
        self.event_worker = Thread(target=self.event_worker_fun, daemon=True)
        self.save_worker.start()
        self.backup_worker.start()
        self.event_worker.start()

    def close(self):
        """
        Closes sensitive threads and joins them. Must be called when the app is closed down.
        """
        self.stop_event.set()
        self.save_worker.join()
        self.backup_worker.join()

    def is_out_of_bounds(self, x, y):
        """
        Checks if a coordinate is out of bounds of the image.
        """
        return x < 0 or y < 0 or x >= self.image.size_x or y >= self.image.size_y
    
    def is_valid_color_string(self, color):
        """
        Checks if a given color hex string is a valid color.
        """
        numeric_value = self.color_string_to_num(color)
        if numeric_value is None or numeric_value > 0xffffff:
            return False

        return True

    def add_event_to_queue(self, event_dict):
        """
        Adds a pixel sync event to the event queue. Those come from the clients.
        :param event_dict: The dictionary with the pixel sync data. Requires a size_x, size_y,
                           and a 2d image field.
        """
        self.pixel_change_queue.put(event_dict)

    def color_string_to_num(self, color):
        try:
            color = color.replace("#", "0x")
            numeric_value = int(color, 16)
            return numeric_value
        except ValueError:
            return None

    def event_worker_fun(self):
        """
        The callback for the event worker thread. Waits for a new event and processes it by updating
        the server side image.
        """
        print("[Info] Starting up event worker.")
        while not self.stop_event.is_set():
            pixel_event = self.pixel_change_queue.get()
            if pixel_event is None:
                continue
            
            color = pixel_event["color"]
            if not self.is_valid_color_string(color):
                continue
            numeric_color = self.color_string_to_num(color)

            pixel_list = pixel_event["pixel_list"]
            with self.image_lock:
                for pixel_pos in pixel_list:
                    print(pixel_pos)
                    x = pixel_pos["x"]
                    y = pixel_pos["y"]
                    self.update_pixel_color(x, y, numeric_color)

    def load_image(self, filename):
        """
        Loads an image from the disk into RAM.
        :param filename: The filename to load the image from.
        """
        with open(filename, "rb") as file:
            self.image = pickle.load(file)

    def save_image(self):
        """
        Saves the image to the current image version on the disk. Overwrites the file.
        """
        if self.image.image_data is None:
            return
        os.makedirs(self.current_image_path, exist_ok=True)
        with open(self.current_image_path + os.sep + self.image_filename, "wb") as file:
            print(self.image)
            pickle.dump(self.image, file)
        print("[Info] Saved image to disk.", flush=True)

    def save_worker_fun(self):
        """
        The callback for the save worker thread. Periodically saves the image to the disk.
        """
        print("[Info] Starting up saving worker.", flush=True)
        while not self.stop_event.is_set():
            self.stop_event.wait(timeout=self.save_interval)
            with self.image_lock:
                self.save_image()

    def backup_image(self):
        """
        Copies the current image directory into a timestamped one used to back up the image.
        """
        try:
            current_datetime = datetime.now().strftime("%Y%m%d_%H%M%S")
            try:
                shutil.copy(self.current_image_path, "images" + os.sep + current_datetime)
            except PermissionError as e:
                print(f"[Warning] Cannot create backup due to permission errors. {e}.", flush=True)
                return

        except FileNotFoundError:
            self.init_image()
            self.save_image()
        print("[Info] Backed up image.")
    
    def backup_worker_fun(self):
        """
        The callback for the backup worker thread. Backs up the image periodically into a
        different directory.
        """
        print("[Info] Starting up backup worker.")
        while not self.stop_event.is_set():
            self.stop_event.wait(timeout=self.backup_check_interval)
            with self.image_lock:
                if "Mon" in datetime.now().strftime("%a"):
                    self.backup_image()
                else:
                    print("No backup to make yet (Only on Mondays).", flush=True)

    def init_image(self):
        """
        Initializes an empty image if none exists yet.
        """
        self.image.image_data = []

        if os.path.isfile(self.current_image_path + os.sep + self.image_filename):
            self.load_image(self.current_image_path + os.sep + self.image_filename)
            print("[Info] Loaded previously stored image.", flush=True)

        else:
            for y in range(self.image.size_y):
                self.image.image_data.append([self.init_color] * self.image.size_x)
            print("[Info] Generated new empty image.", flush=True)

    def update_pixel_color(self, x, y, color):
        """
        Updates the color of a pixel in the image.
        :param x: The x coordinate of the pixel to update.
        :param y: The y coordinate of the pixel to update.
        :param color: The numeric color to set the pixel to.
        """
        if self.is_out_of_bounds(x, y):
            return False
        self.image.image_data[y][x] = color
        return True

    def get_pixel_color(self, x, y):
        """
        Returns the color of a pixel in the image.
        """
        if self.is_out_of_bounds(x, y):
            return None
        return self.image.image_data[y][x]

    def get_size(self):
        """
        Returns the size of the image.
        """
        return self.image.size_x, self.image.size_y

    def get_image(self):
        """
        Returns the full image. If it does not exist yet, it is initialized.
        """
        if self.image.image_data is None:
            self.init_image()
        return self.image.image_data
