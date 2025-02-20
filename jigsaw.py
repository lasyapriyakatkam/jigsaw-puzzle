import streamlit as st
import numpy as np
from PIL import Image
import io
import base64


def split_image(image, rows, cols):
    width, height = image.size
    piece_width, piece_height = width // cols, height // rows
    pieces = []
    for i in range(rows):
        for j in range(cols):
            box = (j * piece_width, i * piece_height, (j + 1) * piece_width, (i + 1) * piece_height)
            piece = image.crop(box)
            pieces.append(piece)
    return pieces


def image_to_base64(image):
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()


st.set_page_config(page_title="Streamlit Jigsaw Puzzle", layout="wide")

st.title("Streamlit Jigsaw Puzzle")

uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    image = Image.open(uploaded_file)

    col1, col2 = st.columns(2)

    with col1:
        st.image(image, caption="Original Image", use_column_width=True)

    with col2:
        difficulty_options = {
            "Easy": (2, 2),
            "Medium": (3, 3),
            "Hard": (4, 4)
        }
        difficulty = st.selectbox("Select Difficulty", list(difficulty_options.keys()))
        rows, cols = difficulty_options[difficulty]

        if st.button("Create Puzzle"):
            pieces = split_image(image, rows, cols)
            shuffled_pieces = pieces.copy()
            np.random.shuffle(shuffled_pieces)

            st.write("Puzzle pieces (shuffled):")

            puzzle_html = f"""
                <div style="display: grid; grid-template-columns: repeat({cols}, 1fr); gap: 5px; width: 100%;">
                """

            for piece in shuffled_pieces:
                piece_base64 = image_to_base64(piece)
                puzzle_html += f"""
                    <img src="data:image/png;base64,{piece_base64}" style="width: 100%; cursor: move;" draggable="true">
                    """

            puzzle_html += "</div>"

            st.components.v1.html(puzzle_html, height=400)

            st.write(
                "Note: The pieces are displayed in a shuffled order. Try to mentally arrange them to solve the puzzle.")

st.sidebar.title("Instructions")
st.sidebar.write("1. Upload an image")
st.sidebar.write("2. Select the difficulty level")
