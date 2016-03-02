# dl-agent
CLI download utility

## Installation

```shell
npm install -g dl-agent
```

*`dl-agent` requires [aria2](https://aria2.github.io) to work properly.

## Usage

```
  Usage: dl [options] [uri...]

  Options:

    -h, --help       output usage information
    -V, --version    output the version number
    -a, --add <uri>  Add <uri> as a download task
    -r, --rm <id>    Remove a task by <id>
    -d, --dir <dir>  Specify <dir> for download tasks
    -l, --list       List all tasks
    -D, --deamon     Start aria2 deamon
    -v, --verbose    Verbose output
    -w, --watch      Watch status of tasks

```

Run `dl -D` to start the download deamon, then run `dl [uris]` to add download tasks.

Note that `uris` can be http/https/ftp/torrent/magnet/metalink links. Uri's types will be auto detected and invoke corresponding task runners.

Use `dl -l` to check the current downloading/uploading status, or you can type `dl -w` to watch the stat over time.
