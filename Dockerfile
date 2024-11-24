FROM python:3.12-alpine

WORKDIR /
RUN mkdir digital_garden
WORKDIR /digital_garden

COPY requirements.txt /digital_garden
RUN pip install -r requirements.txt

COPY rsc /digital_garden
COPY templates /digital_garden
COPY app.py /digital_garden

CMD ["python3", "app.py"]
