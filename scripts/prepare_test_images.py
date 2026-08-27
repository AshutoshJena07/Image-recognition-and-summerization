from PIL import Image, ImageDraw, ImageFont
import os

def create_test_images():
    output_dir = "tests/test_assets"
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Normal scene: Blue background with a yellow circle (representing a sun)
    img_scene = Image.new("RGB", (400, 400), color=(135, 206, 235))  # Sky blue
    draw = ImageDraw.Draw(img_scene)
    # Draw yellow sun
    draw.ellipse([150, 150, 250, 250], fill=(255, 223, 0), outline=(255, 200, 0))
    img_scene.save(os.path.join(output_dir, "normal_scene.png"))
    print(f"Created normal_scene.png in {output_dir}")
    
    # 2. Text document: White background with black text
    img_text = Image.new("RGB", (600, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img_text)
    # Since we might not have a TTF font file handy, PIL uses a default bitmap font if we pass font=None
    draw.text((20, 20), "NOTICE OF MEETING\nDate: August 26, 2026\nTime: 10:00 AM\nLocation: Conference Room A", fill=(0, 0, 0))
    img_text.save(os.path.join(output_dir, "text_document.png"))
    print(f"Created text_document.png in {output_dir}")

    # 3. Mixed image: Red warning box with text
    img_mixed = Image.new("RGB", (400, 400), color=(240, 240, 240))
    draw = ImageDraw.Draw(img_mixed)
    # Red square
    draw.rectangle([100, 100, 300, 300], fill=(220, 50, 50))
    # Draw text on red square
    draw.text((120, 180), "STOP AND READ\nFIRE HAZARD", fill=(255, 255, 255))
    img_mixed.save(os.path.join(output_dir, "mixed_image.png"))
    print(f"Created mixed_image.png in {output_dir}")

if __name__ == "__main__":
    create_test_images()
