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
        self.image_size_x = 1000
        self.image_size_y = 1000
        self.image = None
        self.save_interval = 60
        self.backup_check_interval = 60 * 60 * 24
        self.stop_event = Event()
        self.save_worker = Thread(target=self.save_worker_fun, daemon=True)
        self.backup_worker = Thread(target=self.backup_worker_fun, daemon=True)
        self.event_worker = Thread(target=self.event_worker_fun, daemon=True)
        self.save_worker.start()
        self.backup_worker.start()
        self.event_worker.start()
        self.pixel_change_queue = queue.Queue()

    def is_out_of_bounds(self, x, y):
        return x < 0 or y < 0 or x >= self.image_size_x or y >= self.image_size_y

    def add_event_to_queue(self, event_dict):
        self.pixel_change_queue.put(event_dict)

    def event_worker_fun(self):
        print("[Info] Starting up event worker.")
        while not self.stop_event.is_set():
            pixel_event = self.pixel_change_queue.get()
            if pixel_event is None:
                continue
            
            color = pixel_event["color"]
            pixel_list = pixel_event["pixel_list"]
            with self.image_lock:
                for pixel in pixel_list:
                    x = pixel["x"]
                    y = pixel["y"]
                    self.image[y][x] = color

    def save_image(self):
        if self.image is None:
            return
        os.makedirs(self.current_image_path, exist_ok=True)
        with open(self.current_image_path + os.sep + self.image_filename, "w") as file:
            for row in self.image:
                line = ""
                for cell in row:
                    line += cell + " "
                line = line[:-1]
                file.write(line)
        print("[Info] Saved image to disk.")

    def save_worker_fun(self):
        print("[Info] Starting up saving worker.")
        while not self.stop_event.is_set():
            self.stop_event.wait(timeout=self.save_interval)
            with self.image_lock:
                self.save_image()

    def backup_image(self):
        try:
            current_datetime = datetime.now().strftime("%Y%m%d_%H%M%S")
            try:
                shutil.copy(self.current_image_path, "images" + os.sep + current_datetime)
            except PermissionError as e:
                print(f"[Warning] Cannot create backup due to permission errors. {e}.")

        except FileNotFoundError:
            self.init_image()
            self.save_image()
        print("[Info] Backed up image.")
    
    def backup_worker_fun(self):
        print("[Info] Starting up backup worker.")
        while not self.stop_event.is_set():
            self.stop_event.wait(timeout=self.backup_check_interval)
            with self.image_lock:
                if "Mon" in datetime.now().strftime("%a"):
                    self.backup_image()
                else:
                    print("No backup to make yet (Only on Mondays).")

    def load_image(self, filename):
        with open(filename, "r") as file:
            lines = file.readlines()
            self.image = []
            for line in lines:
                line.replace("\n", "")
                colors = line.split(" ")
                color_row = []
                for color in colors:
                    color_row.append(color)
                self.image.append(color_row)

    def init_image(self):
        self.image = []

        if os.path.isfile(self.current_image_path + os.sep + self.image_filename):
            self.load_image(self.current_image_path + os.sep + self.image_filename)
            print("[Info] Loaded previously stored image.")

        else:
            for y in range(self.image_size_y):
                self.image.append(["#000000"] * self.image_size_x)
            print("[Info] Generated new empty image.")

    def update_pixel_color(x, y, color):
        if self.is_out_of_bounds(x, y):
            return False
        self.image[y][x] = color
        return True

    def get_pixel_color(x, y):
        if self.is_out_of_bounds(x, y):
            return None
        return self.image[y][x]

    def get_size(self):
        return self.image_size_x, self.image_size_y

    def get_image(self):
        if self.image is None:
            self.init_image()
        return self.image
