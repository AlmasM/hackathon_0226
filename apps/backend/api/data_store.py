import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')


def _load(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r') as f:
        return json.load(f)


def _save(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


def load_restaurants():
    return _load('restaurants.json')


def save_restaurants(data):
    _save('restaurants.json', data)


def load_images():
    return _load('restaurant_images.json')


def save_images(data):
    _save('restaurant_images.json', data)


def load_templates():
    return _load('story_templates.json')


def save_templates(data):
    _save('story_templates.json', data)


def load_user_profiles():
    return _load('user_profiles.json')
