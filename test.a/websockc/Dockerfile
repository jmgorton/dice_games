# FROM alpine:latest
# RUN apk update && apk add --no-cache python3 py3-pip

FROM python:3-alpine as base

WORKDIR /src
COPY ./requirements.txt .

FROM base AS staging

# python3 or python? 
RUN python -m pip install -r requirements.txt 
COPY ./ ./ 

FROM staging AS ready

# EXPOSE 8765

# python3 or python? 
CMD ["python", "server.py"]