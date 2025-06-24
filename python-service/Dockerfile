# Use the official Python base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /code

# Copy the requirements file first and install dependencies
# This leverages Docker's layer caching
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Download the spaCy model
RUN python -m spacy download en_core_web_sm

# Copy the rest of your application code
COPY . /code/

# Run the corpus loading script and then start the server
# Gunicorn is a production-ready server for Flask
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "app:app"]