  valid = range.test(version)
      } catch (err) {
        this.log.silly('range.test() threw:\n%s', err.stack)
        this.addLog(`- "${execPath}" does not have a valid version`)
        this.addLog('- is it a Python executable?')
        throw err
      }
      if (!valid) {
        this.addLog(`- version is ${version} - should be ${this.semverRange