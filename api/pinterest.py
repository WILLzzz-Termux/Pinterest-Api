from pinterest_downloader import Pinterest

p = Pinterest()

def handler(request):
    url = request.args.get("url")

    if not url:
        return {
            "statusCode": 400,
            "body": "URL is required"
        }

    try:
        result = p.get(url)

        return {
            "statusCode": 200,
            "body": result
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": str(e)
        }
