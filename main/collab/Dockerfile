# FROM alpine:latest
# RUN apk update && apk add --no-cache python3 py3-pip

FROM python:3-alpine AS base

WORKDIR /src
COPY ./requirements.txt .

FROM base AS staging

# python3 or python? 
RUN python -m pip install -r requirements.txt 
COPY ./ ./ 

FROM staging AS ready

EXPOSE 8080 8765

# ENV PYTHONUNBUFFERED=1
# -u: unbuffered (equivalent to ENV PYTHONUNBUFFERED=1)
# making python unbuffered does fix the server log output issue 
# but breaks the client connections which were working, b/c 
# app is async non-blocking (with asyncio), print is blocking 
# i guess it's enough to interrupt the event loop and drop connections 
CMD ["python", "server.py"]