FROM python:3.12-alpine

WORKDIR /
RUN mkdir digital_garden
WORKDIR /digital_garden

COPY requirements.txt /digital_garden
RUN pip install -r requirements.txt

COPY src /digital_garden/src
COPY templates /digital_garden/templates
COPY app.py /digital_garden
COPY resources /digital_garden/resources
COPY run.sh /digital_garden

CMD ["sh", "run.sh"]
