#!/usr/bin/env python3
"""Generate 6 IP-as-logo images for pico project using Pillow."""

from PIL import Image, ImageDraw
import math

def create_canvas(size, bg_color):
    """Create a new image with the given background color."""
    img = Image.new('RGB', (size, size), bg_color)
    return img

def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = xy
    # Draw main body
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    # Draw corners
    draw.pieslice([x0, y0, x0 + 2*radius, y0 + 2*radius], 180, 270, fill=fill)
    draw.pieslice([x1 - 2*radius, y0, x1, y0 + 2*radius], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2*radius, x0 + 2*radius, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2*radius, y1 - 2*radius, x1, y1], 0, 90, fill=fill)

def draw_circle(draw, center, radius, fill):
    """Draw a circle."""
    x, y = center
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=fill)

def draw_ellipse(draw, xy, fill):
    """Draw an ellipse."""
    draw.ellipse(xy, fill=fill)

def draw_polygon(draw, points, fill):
    """Draw a polygon."""
    draw.polygon(points, fill=fill)

def draw_triangle(draw, p1, p2, p3, fill):
    """Draw a triangle."""
    draw.polygon([p1, p2, p3], fill=fill)

def draw_wing(draw, center, width, height, fill, flip=False):
    """Draw a wing shape."""
    cx, cy = center
    if flip:
        points = [
            (cx, cy),
            (cx - width, cy - height // 2),
            (cx - width, cy + height // 3),
        ]
    else:
        points = [
            (cx, cy),
            (cx + width, cy - height // 2),
            (cx + width, cy + height // 3),
        ]
    draw.polygon(points, fill=fill)

def draw_eye(draw, center, radius, fill):
    """Draw a simple eye (filled circle)."""
    draw_circle(draw, center, radius, fill)

def draw_mouth(draw, center, width, fill):
    """Draw a simple small mouth."""
    cx, cy = center
    # Small arc-like mouth using a small ellipse
    draw.arc([cx - width//2, cy - width//4, cx + width//2, cy + width//4], 0, 180, fill=fill, width=2)

def draw_heart(draw, center, size, fill):
    """Draw a simple heart shape."""
    cx, cy = center
    # Two circles and a triangle
    r = size // 3
    draw_circle(draw, (cx - r, cy - r//2), r, fill)
    draw_circle(draw, (cx + r, cy - r//2), r, fill)
    draw_polygon(draw, [
        (cx - r - 2, cy),
        (cx + r + 2, cy),
        (cx, cy + r + size//3)
    ], fill=fill)

# Image generation functions for each direction

def generate_camera_wings(bg_color, color1, color2, output_path):
    """Generate camera with wings IP character."""
    size = 1024
    img = create_canvas(size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # color1 = slate (main body), color2 = amber (accent)
    # Camera body - main rounded rectangle
    body_w, body_h = 380, 320
    body_x = (size - body_w) // 2
    body_y = size // 2 - 50
    
    # Wings first (behind body)
    wing_w, wing_h = 180, 220
    # Left wing
    left_wing_points = [
        (body_x - 20, body_y + 80),
        (body_x - wing_w, body_y + 20),
        (body_x - wing_w + 20, body_y + wing_h - 40),
        (body_x - 20, body_y + body_h - 60),
    ]
    draw.polygon(left_wing_points, fill=color2)
    # Right wing
    right_wing_points = [
        (body_x + body_w + 20, body_y + 80),
        (body_x + body_w + wing_w, body_y + 20),
        (body_x + body_w + wing_w - 20, body_y + wing_h - 40),
        (body_x + body_w + 20, body_y + body_h - 60),
    ]
    draw.polygon(right_wing_points, fill=color2)
    
    # Camera body
    draw_rounded_rect(draw, [body_x, body_y, body_x + body_w, body_y + body_h], 40, color1)
    
    # Lens (circle on camera)
    lens_r = 100
    lens_cx = size // 2
    lens_cy = body_y + body_h // 2 - 20
    draw_circle(draw, (lens_cx, lens_cy), lens_r, color2)
    # Inner lens
    draw_circle(draw, (lens_cx, lens_cy), 50, color1)
    
    # Eyes (on top part of camera)
    eye_r = 28
    eye_y = body_y + 70
    draw_eye(draw, (lens_cx - 80, eye_y), eye_r, color2)
    draw_eye(draw, (lens_cx + 80, eye_y), eye_r, color2)
    
    # Small mouth
    draw_mouth(draw, (lens_cx, body_y + body_h - 70), 40, color2)
    
    # Small flash/indicator dot
    draw_circle(draw, (body_x + 60, body_y + 40), 15, color2)
    
    img.save(output_path, 'PNG')
    return output_path

def generate_polaroid_smile(bg_color, color1, color2, output_path):
    """Generate polaroid with smile IP character."""
    size = 1024
    img = create_canvas(size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # color1 = white (main body), color2 = blue (accent)
    # Polaroid body - rounded rectangle (portrait orientation)
    body_w, body_h = 340, 420
    body_x = (size - body_w) // 2
    body_y = (size - body_h) // 2 + 40
    
    # Polaroid frame (white)
    draw_rounded_rect(draw, [body_x, body_y, body_x + body_w, body_y + body_h], 30, color1)
    
    # Photo area (blue accent)
    photo_margin = 30
    photo_top = body_y + 35
    draw_rounded_rect(draw, [
        body_x + photo_margin, 
        photo_top, 
        body_x + body_w - photo_margin, 
        body_y + body_h - 100
    ], 15, color2)
    
    # Eyes in photo area
    eye_r = 25
    eye_y = photo_top + 80
    center_x = size // 2
    draw_eye(draw, (center_x - 55, eye_y), eye_r, color1)
    draw_eye(draw, (center_x + 55, eye_y), eye_r, color1)
    
    # Smile in photo area
    smile_y = photo_top + 160
    draw.arc([center_x - 40, smile_y - 20, center_x + 40, smile_y + 20], 0, 180, fill=color1, width=6)
    
    # Bottom area - polaroid bottom with small details
    # Small flash icon
    flash_x = body_x + 50
    flash_y = body_y + body_h - 40
    draw_circle(draw, (flash_x, flash_y), 12, color2)
    
    # Small hearts or dots
    draw_circle(draw, (body_x + body_w - 50, body_y + body_h - 40), 10, color2)
    
    img.save(output_path, 'PNG')
    return output_path

def generate_photo_stack_heart(bg_color, color1, color2, output_path):
    """Generate photo stack with heart IP character."""
    size = 1024
    img = create_canvas(size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # color1 = blue (main), color2 = red (heart accent)
    
    # Stack of photos (3 overlapping rounded rectangles)
    photo_w, photo_h = 280, 340
    center_x = size // 2
    
    # Bottom photo (slightly rotated look - offset)
    bottom_x = center_x - photo_w // 2 + 20
    bottom_y = size // 2 - 80
    draw_rounded_rect(draw, [bottom_x, bottom_y, bottom_x + photo_w, bottom_y + photo_h], 20, color1)
    
    # Middle photo
    mid_x = center_x - photo_w // 2 - 10
    mid_y = size // 2 - 120
    draw_rounded_rect(draw, [mid_x, mid_y, mid_x + photo_w, mid_y + photo_h], 20, color1)
    
    # Top photo
    top_x = center_x - photo_w // 2 + 5
    top_y = size // 2 - 160
    draw_rounded_rect(draw, [top_x, top_y, top_x + photo_w, top_y + photo_h], 20, color1)
    
    # Heart on top of stack
    heart_size = 80
    heart_cx = center_x
    heart_cy = top_y - 20
    draw_heart(draw, (heart_cx, heart_cy), heart_size, color2)
    
    # Eyes on the top photo
    eye_r = 22
    eye_y = top_y + 100
    draw_eye(draw, (center_x - 45, eye_y), eye_r, color2)
    draw_eye(draw, (center_x + 45, eye_y), eye_r, color2)
    
    # Small smile
    smile_y = top_y + 160
    draw.arc([center_x - 30, smile_y - 15, center_x + 30, smile_y + 15], 0, 180, fill=color2, width=5)
    
    img.save(output_path, 'PNG')
    return output_path

def main():
    output_dir = '/root/hermes/pico/frontend/public'
    
    # Direction A - Camera with wings
    # Variant 1: #FDEBD0 bg, #5D6D7E slate, #F39C12 amber
    generate_camera_wings('#FDEBD0', '#5D6D7E', '#F39C12', f'{output_dir}/logo-A1.png')
    print(f"Generated logo-A1.png")
    
    # Variant 2: #FDEBD0 bg, #85929E, #F5B041
    generate_camera_wings('#FDEBD0', '#85929E', '#F5B041', f'{output_dir}/logo-A2.png')
    print(f"Generated logo-A2.png")
    
    # Direction B - Polaroid with smile
    # Variant 1: #FADBD8 bg, #FFFFFF white, #5DADE2 blue
    generate_polaroid_smile('#FADBD8', '#FFFFFF', '#5DADE2', f'{output_dir}/logo-B1.png')
    print(f"Generated logo-B1.png")
    
    # Variant 2: #FADBD8 bg, #FDFEFE, #85C1E9
    generate_polaroid_smile('#FADBD8', '#FDFEFE', '#85C1E9', f'{output_dir}/logo-B2.png')
    print(f"Generated logo-B2.png")
    
    # Direction C - Photo stack with heart
    # Variant 1: #EBF5FB bg, #3498DB blue, #E74C3C red
    generate_photo_stack_heart('#EBF5FB', '#3498DB', '#E74C3C', f'{output_dir}/logo-C1.png')
    print(f"Generated logo-C1.png")
    
    # Variant 2: #EBF5FB bg, #5DADE2, #F1948A
    generate_photo_stack_heart('#EBF5FB', '#5DADE2', '#F1948A', f'{output_dir}/logo-C2.png')
    print(f"Generated logo-C2.png")
    
    print("\nAll 6 images generated successfully!")

if __name__ == '__main__':
    main()