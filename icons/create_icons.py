from PIL import Image, ImageDraw

def create_icon(size):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Define colors
    bg_color = (45, 66, 99, 255)  # Primary color
    accent_color = (200, 75, 49, 255)  # Accent color
    
    # Draw shield shape
    padding = size // 8
    shield_top = padding
    shield_bottom = size - padding
    shield_left = padding
    shield_right = size - padding
    shield_middle = size // 2
    
    # Shield points
    points = [
        (shield_middle, shield_top),
        (shield_right, shield_top + padding),
        (shield_right, shield_bottom - padding * 2),
        (shield_middle, shield_bottom),
        (shield_left, shield_bottom - padding * 2),
        (shield_left, shield_top + padding),
    ]
    
    # Draw filled shield
    draw.polygon(points, fill=bg_color)
    
    # Draw plus sign
    line_width = max(2, size // 16)
    center = size // 2
    cross_size = size // 4
    
    # Vertical line
    draw.rectangle([
        center - line_width // 2,
        center - cross_size,
        center + line_width // 2,
        center + cross_size
    ], fill=accent_color)
    
    # Horizontal line
    draw.rectangle([
        center - cross_size,
        center - line_width // 2,
        center + cross_size,
        center + line_width // 2
    ], fill=accent_color)
    
    img.save(f'icon{size}.png')

# Create all icon sizes
for size in [16, 32, 48, 128]:
    create_icon(size)

print("Icons created successfully!")
